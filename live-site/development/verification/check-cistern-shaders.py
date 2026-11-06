#!/usr/bin/env python3
"""Compile the exact Cistern GLSL through the host's existing Mesa EGL driver.

This is a native OpenGL ES shader and small offscreen draw check. It does not
claim browser WebGL validation or hardware performance. No packages, browsers,
GPU settings, or sandbox settings are installed or changed.
"""
import ctypes as C
import ctypes.util
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import struct
import zlib
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'dist/game/engine2/cistern-renderer.js'
REPORT = ROOT / 'docs/verification/cistern-shaders.json'
I, U, F, P = C.c_int, C.c_uint, C.c_float, C.c_void_p


def scene_geometry():
    """Run the actual scene builder and capture the GPU path's exact uniforms."""
    script = r'''
import {CisternRenderer} from './dist/game/engine2/cistern-renderer.js';
import {createCisternState} from './dist/game/engine2/cistern-model.js';
import {defaultHero} from './dist/game/engine2/mako.js';
const renderer=Object.create(CisternRenderer.prototype), captured={};
Object.assign(renderer,{gl:null,canvas:{width:1024,height:768,clientWidth:1024,getBoundingClientRect:()=>({width:1024,height:768,left:0,top:0})},art:{},sprites:[],zoom:1.35,quality:'high',camera:null,lost:false,destroyed:false,stats:{},software:{render:()=>({})}});
renderer.initialize();
renderer.locations={pos:0,norm:1,color:2,material:3};
renderer.shadowPosition=0;renderer.shadowVP='shadowVP';renderer.shadowSize=1024;
renderer.uniforms={};for(const key of ['uVP','uLightVP','uEye','uLightPosition[0]','uLightColor[0]','uTime','uShadowTexel','uResolution','uShadow','uMaterialAtlas','uMaterialReady','uAmbient','uKey','uFog','uFogDensity'])renderer.uniforms[key]=key;
const uniform=(name,...values)=>{captured[name]=values.length===1?Array.isArray(values[0])?values[0]:ArrayBuffer.isView(values[0])?Array.from(values[0]):values[0]:values;};
renderer.gl=new Proxy({uniformMatrix4fv:(name,transpose,value)=>uniform(name,value),uniform3fv:uniform,uniform2f:uniform,uniform1f:uniform,uniform1i:uniform},{get:(object,key)=>key in object?object[key]:/^[A-Z_0-9]+$/.test(key)?0:()=>{}});
renderer.software=null;
renderer.materialReady=true;
const state=createCisternState(),party=[defaultHero(0,4),defaultHero(1,4),defaultHero(2,4)];
state.time=2;renderer.render(state,party,1/60);
process.stdout.write(JSON.stringify({width:1024,height:768,uniforms:captured,meshes:Object.fromEntries(Object.entries(renderer.meshes).map(([name,mesh])=>[name,{count:mesh.count,data:Array.from(mesh.data)}]))}));
'''
    result = subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def save_png(path, width, height, rgba):
    def chunk(kind, data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    stride=width*4
    rows=b''.join(b'\0'+rgba[y*stride:(y+1)*stride] for y in reversed(range(height)))
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',width,height,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,6))+chunk(b'IEND',b''))


def main():
    scene_check = '--scene' in sys.argv
    raw = SOURCE.read_bytes()
    source = raw.decode('utf-8')
    names = ('VS', 'FS', 'SHADOW_VS', 'SHADOW_FS')
    shaders = {}
    for name in names:
        match = re.search(r'const\s+' + name + r'\s*=\s*`([\s\S]*?)`;', source)
        if not match:
            raise RuntimeError(f'Cannot extract exact shader {name}')
        shaders[name] = match.group(1)
    sprite_match = re.search(r'initializeSprites\(\)\s*\{[^`]*`([^`]+)`\s*,\s*`([^`]+)`', source)
    if sprite_match:
        shaders['SPRITE_VS'], shaders['SPRITE_FS'] = sprite_match.groups()
    report = {
        'schema': 'ash-aether.cistern-shader-validation/1',
        'checked_at_utc': datetime.now(timezone.utc).isoformat(),
        'source': str(SOURCE.relative_to(ROOT)),
        'source_sha256': hashlib.sha256(raw).hexdigest(),
        'method': 'Existing Mesa EGL surfaceless pbuffer; OpenGL ES context; exact shader source compile/link/validate and 64x64 offscreen triangle draws via Python ctypes.',
        'limits': [
            'Native OpenGL ES validation, not a browser WebGL or ANGLE execution.',
            'Offscreen native scene and shader smoke draws do not establish real-device hardware performance.' if scene_check else 'Small shader smoke draws, not the full dungeon scene or hardware performance measurements.',
        ],
        'shaders': {}, 'programs': {}, 'passed': False,
    }
    egl_path = ctypes.util.find_library('EGL')
    if not egl_path:
        raise RuntimeError('Existing EGL library unavailable')
    egl = C.CDLL(egl_path)

    def egl_fn(name, result, args):
        call = getattr(egl, name)
        call.restype, call.argtypes = result, args
        return call

    get_proc = egl_fn('eglGetProcAddress', P, [C.c_char_p])
    get_error = egl_fn('eglGetError', U, [])
    get_platform_addr = get_proc(b'eglGetPlatformDisplayEXT')
    if not get_platform_addr:
        raise RuntimeError('Surfaceless EGL platform unavailable')
    get_platform = C.CFUNCTYPE(P, U, P, C.POINTER(I))(get_platform_addr)
    display = get_platform(0x31DD, None, None)  # EGL_PLATFORM_SURFACELESS_MESA
    initialize = egl_fn('eglInitialize', U, [P, C.POINTER(I), C.POINTER(I)])
    major, minor = I(), I()
    if not initialize(display, C.byref(major), C.byref(minor)):
        raise RuntimeError(f'EGL initialize failed: {hex(get_error())}')
    query = egl_fn('eglQueryString', C.c_char_p, [P, I])
    report['egl'] = {'version': f'{major.value}.{minor.value}', 'vendor': query(display, 0x3053).decode(), 'client_apis': query(display, 0x308D).decode(), 'library': egl_path}
    bind_api = egl_fn('eglBindAPI', U, [U])
    if not bind_api(0x30A0):  # EGL_OPENGL_ES_API
        raise RuntimeError('Cannot bind existing OpenGL ES API')
    config, count = P(), I()
    attributes = (I * 15)(0x3033, 1, 0x3040, 4, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8, 0x3025, 16, 0x3038)
    choose = egl_fn('eglChooseConfig', U, [P, C.POINTER(I), C.POINTER(P), I, C.POINTER(I)])
    if not choose(display, attributes, C.byref(config), 1, C.byref(count)) or count.value != 1:
        raise RuntimeError(f'No existing GLES2 pbuffer configuration: {hex(get_error())}')
    create_surface = egl_fn('eglCreatePbufferSurface', P, [P, P, C.POINTER(I)])
    width, height = (1024,768) if scene_check else (64,64)
    surface = create_surface(display, config, (I * 5)(0x3057, width, 0x3056, height, 0x3038))
    create_context = egl_fn('eglCreateContext', P, [P, P, P, C.POINTER(I)])
    context = create_context(display, config, None, (I * 3)(0x3098, 2, 0x3038))
    make_current = egl_fn('eglMakeCurrent', U, [P, P, P, P])
    if not surface or not context or not make_current(display, surface, surface, context):
        raise RuntimeError(f'OpenGL ES pbuffer/context failed: {hex(get_error())}')
    functions = {}

    def gl(name, result, args):
        if name not in functions:
            address = get_proc(name.encode())
            if not address:
                raise RuntimeError(f'Missing existing GLES entry point {name}')
            functions[name] = C.CFUNCTYPE(result, *args)(address)
        return functions[name]

    get_string = gl('glGetString', C.c_char_p, [U])
    report['driver'] = {name: get_string(enum).decode() for name, enum in [('vendor', 0x1F00), ('renderer', 0x1F01), ('version', 0x1F02), ('glsl_version', 0x8B8C)]}
    create_shader = gl('glCreateShader', U, [U])
    shader_source = gl('glShaderSource', None, [U, I, C.POINTER(C.c_char_p), C.POINTER(I)])
    compile_shader = gl('glCompileShader', None, [U])
    get_shader = gl('glGetShaderiv', None, [U, U, C.POINTER(I)])
    get_shader_log = gl('glGetShaderInfoLog', None, [U, I, C.POINTER(I), P])
    ids = {}
    try:
        for name, text in shaders.items():
            shader = create_shader(0x8B31 if name.endswith('VS') else 0x8B30)
            encoded = text.encode(); pointer = C.c_char_p(encoded); length = I(len(encoded))
            shader_source(shader, 1, C.byref(pointer), C.byref(length)); compile_shader(shader)
            status, log_length = I(), I(); get_shader(shader, 0x8B81, C.byref(status)); get_shader(shader, 0x8B84, C.byref(log_length))
            buffer = C.create_string_buffer(max(1, log_length.value)); get_shader_log(shader, len(buffer), None, buffer)
            report['shaders'][name] = {'sha256': hashlib.sha256(encoded).hexdigest(), 'compiled': bool(status.value), 'log': buffer.value.decode(errors='replace')}
            ids[name] = shader
        if not all(x['compiled'] for x in report['shaders'].values()):
            raise RuntimeError('At least one exact dungeon shader failed to compile')
        create_program = gl('glCreateProgram', U, [])
        attach = gl('glAttachShader', None, [U, U]); link = gl('glLinkProgram', None, [U])
        get_program = gl('glGetProgramiv', None, [U, U, C.POINTER(I)])
        program_log = gl('glGetProgramInfoLog', None, [U, I, C.POINTER(I), P])
        use = gl('glUseProgram', None, [U]); uniform = gl('glGetUniformLocation', I, [U, C.c_char_p])
        programs = {}
        program_specs=[('main', 'VS', 'FS'), ('shadow', 'SHADOW_VS', 'SHADOW_FS')]
        if sprite_match:program_specs.append(('sprite','SPRITE_VS','SPRITE_FS'))
        for name, vs, fs in program_specs:
            program = create_program(); attach(program, ids[vs]); attach(program, ids[fs]); link(program)
            status, log_length = I(), I(); get_program(program, 0x8B82, C.byref(status)); get_program(program, 0x8B84, C.byref(log_length))
            buffer = C.create_string_buffer(max(1, log_length.value)); program_log(program, len(buffer), None, buffer)
            report['programs'][name] = {'linked': bool(status.value), 'link_log': buffer.value.decode(errors='replace')}
            if not status.value:
                raise RuntimeError(f'{name} program failed to link')
            programs[name] = program
        viewport = gl('glViewport', None, [I, I, I, I]); viewport(0, 0, 64, 64)
        clear_color = gl('glClearColor', None, [F, F, F, F]); clear = gl('glClear', None, [U])
        get_attribute = gl('glGetAttribLocation', I, [U, C.c_char_p])
        gen_buffers = gl('glGenBuffers', None, [I, C.POINTER(U)]); bind_buffer = gl('glBindBuffer', None, [U, U])
        buffer_data = gl('glBufferData', None, [U, C.c_ssize_t, P, U])
        enable_attribute = gl('glEnableVertexAttribArray', None, [U])
        attribute_pointer = gl('glVertexAttribPointer', None, [U, I, U, U, I, P])
        uniform_matrix = gl('glUniformMatrix4fv', None, [I, I, U, C.POINTER(F)])
        uniform3 = gl('glUniform3fv', None, [I, I, C.POINTER(F)])
        uniform2 = gl('glUniform2f', None, [I, F, F]); uniform1 = gl('glUniform1f', None, [I, F])
        uniform_int = gl('glUniform1i', None, [I, I])
        data = (F * 36)(-.8,-.8,0, 0,0,1, .8,.2,.1, 4,.5,1, .8,-.8,0, 0,0,1, .8,.2,.1, 4,.5,1, 0,.8,0, 0,0,1, .8,.2,.1, 4,.5,1)
        vertex_buffer = U(); gen_buffers(1, C.byref(vertex_buffer)); bind_buffer(0x8892, vertex_buffer); buffer_data(0x8892, C.sizeof(data), data, 0x88E4)
        identity = (F * 16)(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1)
        texture = U(); gl('glGenTextures', None, [I, C.POINTER(U)])(1, C.byref(texture)); gl('glBindTexture', None, [U,U])(0x0DE1, texture)
        white = (C.c_ubyte * 4)(255,255,255,255)
        gl('glTexImage2D', None, [U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,1,1,0,0x1908,0x1401,white)
        tex_parameter = gl('glTexParameteri', None, [U,U,I])
        for enum, value in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]: tex_parameter(0x0DE1,enum,value)
        error = gl('glGetError', U, [])
        for name, program in programs.items():
            use(program); clear_color(0,0,0,1); clear(0x4000|0x0100)
            for attr, offset in [('aPosition',0),('aNormal',12),('aColor',24),('aMaterial',36)]:
                loc = get_attribute(program, attr.encode())
                if loc >= 0: enable_attribute(loc); attribute_pointer(loc,3,0x1406,0,48,P(offset))
            uv_loc=get_attribute(program,b'aUV')
            if uv_loc>=0:enable_attribute(uv_loc);attribute_pointer(uv_loc,2,0x1406,0,48,P(24))
            for matrix in [b'uVP', b'uLightVP']:
                loc=uniform(program,matrix)
                if loc>=0: uniform_matrix(loc,1,0,identity)
            if name == 'main':
                uniform3(uniform(program,b'uEye'),1,(F*3)(0,0,3))
                uniform3(uniform(program,b'uLightPosition[0]'),8,(F*24)(*([0,4,3]*8)))
                uniform3(uniform(program,b'uLightColor[0]'),8,(F*24)(*([.1,.1,.1]*8)))
                uniform1(uniform(program,b'uTime'),1); uniform1(uniform(program,b'uShadowTexel'),1)
                uniform2(uniform(program,b'uResolution'),64,64); uniform_int(uniform(program,b'uShadow'),0)
                uniform_int(uniform(program,b'uMaterialAtlas'),0);uniform1(uniform(program,b'uMaterialReady'),1)
                for key,values in [(b'uAmbient',[.11,.145,.16]),(b'uKey',[.42,.45,.42]),(b'uFog',[.012,.029,.034])]:uniform3(uniform(program,key),1,(F*3)(*values))
                uniform1(uniform(program,b'uFogDensity'),.00065)
            elif name == 'sprite':
                uniform_int(uniform(program,b'uSprite'),0);uniform3(uniform(program,b'uTint'),1,(F*3)(1,1,1));uniform1(uniform(program,b'uAlpha'),1)
            gl('glValidateProgram', None, [U])(program)
            validated=I(); get_program(program,0x8B83,C.byref(validated))
            gl('glDrawArrays', None, [U,I,I])(0x0004,0,3)
            gl('glFinish', None, [])()
            pixels=(C.c_ubyte*4)(); gl('glReadPixels', None, [I,I,I,I,U,U,P])(32,32,1,1,0x1908,0x1401,pixels)
            code=error(); result=report['programs'][name]
            result.update(validated=bool(validated.value), smoke_center_rgba=list(pixels), gl_error=hex(code), draw_changed_pixel=list(pixels)!=[0,0,0,255])
        report['passed']=all(x['linked'] and x['validated'] and x['draw_changed_pixel'] and x['gl_error']=='0x0' for x in report['programs'].values())
        if scene_check:
            from PIL import Image
            scene=scene_geometry(); uploads={}
            for name, mesh in scene['meshes'].items():
                values=(F*len(mesh['data']))(*mesh['data']); handle=U()
                gen_buffers(1,C.byref(handle));bind_buffer(0x8892,handle);buffer_data(0x8892,C.sizeof(values),values,0x88E4)
                uploads[name]=(handle,mesh['count'])
            # Match CisternRenderer.createShadowTarget and render's two passes.
            active_texture=gl('glActiveTexture',None,[U]);active_texture(0x84C0)
            shadow_texture=U();gl('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(shadow_texture));gl('glBindTexture',None,[U,U])(0x0DE1,shadow_texture)
            gl('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,1024,1024,0,0x1908,0x1401,None)
            for enum,value in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]:tex_parameter(0x0DE1,enum,value)
            depth=U();gl('glGenRenderbuffers',None,[I,C.POINTER(U)])(1,C.byref(depth));gl('glBindRenderbuffer',None,[U,U])(0x8D41,depth)
            gl('glRenderbufferStorage',None,[U,U,I,I])(0x8D41,0x81A5,1024,1024)
            target=U();gl('glGenFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(target));bind_framebuffer=gl('glBindFramebuffer',None,[U,U]);bind_framebuffer(0x8D40,target)
            gl('glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,shadow_texture,0)
            gl('glFramebufferRenderbuffer',None,[U,U,U,U])(0x8D40,0x8D00,0x8D41,depth)
            framebuffer_status=gl('glCheckFramebufferStatus',U,[U])(0x8D40)
            if framebuffer_status!=0x8CD5:raise RuntimeError(f'Exact shadow framebuffer incomplete: {hex(framebuffer_status)}')
            material_path=ROOT/'dist/game/engine2/art/cistern/material-atlas-v2.webp'
            atlas_original=Image.open(material_path).convert('RGBA')
            # Match the browser upload's power-of-two storage policy; Pillow's
            # bilinear resampler is used here instead of a browser canvas.
            atlas=atlas_original.resize((1024,1024),Image.Resampling.BILINEAR);atlas_width,atlas_height=atlas.size
            atlas_bytes=atlas.tobytes();atlas_data=(C.c_ubyte*len(atlas_bytes)).from_buffer_copy(atlas_bytes)
            material_texture=U();active_texture(0x84C1);gl('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(material_texture));gl('glBindTexture',None,[U,U])(0x0DE1,material_texture)
            gl('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,atlas_width,atlas_height,0,0x1908,0x1401,atlas_data)
            for enum,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:tex_parameter(0x0DE1,enum,value)
            gl('glGenerateMipmap',None,[U])(0x0DE1);tex_parameter(0x0DE1,0x2801,0x2703)
            enable=gl('glEnable',None,[U]);disable=gl('glDisable',None,[U]);depth_mask=gl('glDepthMask',None,[U]);blend=gl('glBlendFunc',None,[U,U]);draw=gl('glDrawArrays',None,[U,I,I])
            enable(0x0B71);gl('glDepthFunc',None,[U])(0x0203);disable(0x0B44)
            def draw_mesh(name,program,shadow=False):
                handle,count=uploads[name];bind_buffer(0x8892,handle)
                if shadow:
                    for attr in ['aNormal','aColor','aMaterial']:
                        old_loc=get_attribute(programs['main'],attr.encode())
                        if old_loc>=0:gl('glDisableVertexAttribArray',None,[U])(old_loc)
                for attr,offset in [('aPosition',0)]+([] if shadow else [('aNormal',12),('aColor',24),('aMaterial',36)]):
                    loc=get_attribute(program,attr.encode())
                    if loc>=0:enable_attribute(loc);attribute_pointer(loc,3,0x1406,0,48,P(offset))
                draw(0x0004,0,count)
            u=scene['uniforms'];shadow_program=programs['shadow'];main_program=programs['main']
            disable(0x0BE2);depth_mask(1);viewport(0,0,1024,1024);clear_color(1,1,1,1);clear(0x4000|0x0100);use(shadow_program)
            uniform_matrix(uniform(shadow_program,b'uVP'),1,0,(F*16)(*u['shadowVP']))
            draw_mesh('static',shadow_program,True);draw_mesh('dynamic',shadow_program,True)
            bind_framebuffer(0x8D40,0);viewport(0,0,width,height);clear_color(.025,.060,.077,1);clear(0x4000|0x0100);use(main_program)
            for key in ['uVP','uLightVP']:uniform_matrix(uniform(main_program,key.encode()),1,0,(F*16)(*u[key]))
            for key,count in [('uEye',1),('uLightPosition[0]',8),('uLightColor[0]',8)]:uniform3(uniform(main_program,key.encode()),count,(F*(count*3))(*u[key]))
            for key in ['uAmbient','uKey','uFog']:uniform3(uniform(main_program,key.encode()),1,(F*3)(*u[key]))
            uniform1(uniform(main_program,b'uFogDensity'),u['uFogDensity'])
            uniform1(uniform(main_program,b'uTime'),u['uTime']);uniform1(uniform(main_program,b'uShadowTexel'),u['uShadowTexel']);uniform2(uniform(main_program,b'uResolution'),width,height)
            active_texture(0x84C0);gl('glBindTexture',None,[U,U])(0x0DE1,shadow_texture);uniform_int(uniform(main_program,b'uShadow'),0)
            active_texture(0x84C1);gl('glBindTexture',None,[U,U])(0x0DE1,material_texture);uniform_int(uniform(main_program,b'uMaterialAtlas'),1);uniform1(uniform(main_program,b'uMaterialReady'),1)
            draw_mesh('static',main_program);enable(0x0BE2);blend(0x0302,0x0303);depth_mask(0);draw_mesh('shadows',main_program);depth_mask(1);disable(0x0BE2);draw_mesh('dynamic',main_program)
            enable(0x0BE2);blend(0x0302,1);depth_mask(0);draw_mesh('glow',main_program);depth_mask(1);disable(0x0BE2);gl('glFinish',None,[])()
            pixels=(C.c_ubyte*(width*height*4))();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,width,height,0x1908,0x1401,pixels);code=error()
            png_path=REPORT.parent/'cistern-gpu-entry.png';save_png(png_path,width,height,bytes(pixels))
            report['authored_scene']={'path':str(png_path.relative_to(ROOT)),'width':width,'height':height,'meshes':{name:{'vertices':count,'triangles':count//3} for name,(_,count) in uploads.items()},'shadow_framebuffer_complete':True,'gl_error':hex(code),'sha256':hashlib.sha256(png_path.read_bytes()).hexdigest(),'material':{'path':str(material_path.relative_to(ROOT)),'sha256':hashlib.sha256(material_path.read_bytes()).hexdigest(),'source_width':atlas_original.width,'source_height':atlas_original.height,'storage_width':atlas_width,'storage_height':atlas_height,'min_filter':'LINEAR_MIPMAP_LINEAR','resize_limit':'Pillow bilinear resampling approximates the browser canvas upload; browser-specific resampling and optional anisotropy are not reproduced.'},'architecture_sha256':hashlib.sha256((ROOT/'dist/game/engine2/cistern-architecture.js').read_bytes()).hexdigest(),'description':'Actual renderer architecture, dynamic mechanisms, shadow/glow meshes and GPU-path uniform values captured from CisternRenderer.render; generated atlas resampled into 1024x1024 power-of-two storage and mipmapped as in the browser material upload; primary and shadow passes drawn through existing EGL GLES context.','actor_limit':'Illustrated actor textures are prepared by the browser and absent from this native environment capture. Sprite program is independently compiled/linked/validated and smoke-tested above.'}
            report['passed']=report['passed'] and code==0
    except Exception as exc:
        report['error']=str(exc)
    finally:
        make_current(display,None,None,None)
        egl_fn('eglDestroyContext',U,[P,P])(display,context)
        egl_fn('eglDestroySurface',U,[P,P])(display,surface)
        egl_fn('eglTerminate',U,[P])(display)
        REPORT.parent.mkdir(parents=True,exist_ok=True)
        REPORT.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
