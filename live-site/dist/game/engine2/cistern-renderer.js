/**
 * The Remembering Cistern: an entirely local WebGL dungeon renderer.
 * Geometry, shaders, water and lighting are authored here; no CDN is required.
 * The gameplay model owns every position and collision rule.
 */
import {CISTERN, cisternWalkable} from './cistern-model.js';
import {CisternSoftwarePainter} from './cistern-software.js?v=5.42';
import {buildCisternArchitecture,appendCisternCraftDynamics} from './cistern-architecture.js?v=5.41';
import {spriteFacingFlip} from './character-motion.js';
import {resolveActorTint} from './actor-grounding.js?v=5.41';
import {leadCutawayWindow} from './lead-cutaway-541.js?v=5.41';

const PI = Math.PI, TAU = PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rgb = h => typeof h === 'string' ? [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255] : h;
const C = { stone: rgb('#576873'), dark: rgb('#263b45'), edge: rgb('#91a3a2'), brass: rgb('#a78048'), metal: rgb('#3c4d54'), teal: rgb('#4af6ce'), warm: rgb('#ffb45d'), water: rgb('#125c67'), moss: rgb('#34534c') };
const PILLARS = CISTERN.pillars.map(({x,z}) => [x,z]);
const TORCHES = [[-3.15, 1.9, 6], [3.15, 1.9, 10], [-3.15, 1.9, 14], [-11.25, 2.0, 1.5], [11.25, 2.0, 1.5], [-11.25, 2.0, -11.5], [11.25, 2.0, -11.5], [-8.25, 2.2, -19], [8.25, 2.2, -19], [-8.25, 2.2, -27.5], [8.25, 2.2, -27.5]];
const COLORS = ['#e4a957', '#7dc2d6', '#d47c86', '#8fc99b', '#c5a3df', '#d4b16e', '#8cb8bf'];

function identity() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
function mul(a, b) { const c = new Float32Array(16); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) c[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3]; return c; }
function norm(v) { const d = Math.hypot(...v) || 1; return v.map(n => n / d); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function lookAt(eye, at) { const z = norm(eye.map((v, i) => v - at[i])), x = norm(cross([0, 1, 0], z)), y = cross(z, x); return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]); }
function perspective(fov, aspect, near, far) { const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far); return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]); }
function ortho(l, r, b, t, n, f) { return new Float32Array([2 / (r - l), 0, 0, 0, 0, 2 / (t - b), 0, 0, 0, 0, -2 / (f - n), 0, -(r + l) / (r - l), -(t + b) / (t - b), -(f + n) / (f - n), 1]); }
function inverse(m) { const a = Array.from({ length: 4 }, (_, r) => Array.from({ length: 8 }, (_, c) => c < 4 ? m[c * 4 + r] : +(c - 4 === r))); for (let i = 0; i < 4; i++) { let pivot = i; for (let r = i + 1; r < 4; r++) if (Math.abs(a[r][i]) > Math.abs(a[pivot][i])) pivot = r; [a[i], a[pivot]] = [a[pivot], a[i]]; const d = a[i][i]; if (Math.abs(d) < 1e-10) return identity(); for (let c = 0; c < 8; c++) a[i][c] /= d; for (let r = 0; r < 4; r++) if (r !== i) { const s = a[r][i]; for (let c = 0; c < 8; c++) a[r][c] -= s * a[i][c]; } } return new Float32Array(Array.from({ length: 16 }, (_, n) => a[n % 4][4 + Math.floor(n / 4)])); }
function transform(m, p) { const v = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) v[i] = m[i] * p[0] + m[4 + i] * p[1] + m[8 + i] * p[2] + m[12 + i] * p[3]; return v; }

class Geometry {
  constructor() { this.v = []; }
  vertex(p, n, color, material = 0, emission = 0, alpha = 1) { this.v.push(...p, ...n, ...color, material, emission, alpha); }
  tri(a, b, c, color, material = 0, emission = 0, alpha = 1, normal = null) { const n = normal || norm(cross(b.map((v, i) => v - a[i]), c.map((v, i) => v - a[i]))); for (const p of [a, b, c]) this.vertex(p, n, color, material, emission, alpha); }
  quad(a, b, c, d, color, mat = 0, em = 0, alpha = 1, n = null) { this.tri(a, b, c, color, mat, em, alpha, n); this.tri(a, c, d, color, mat, em, alpha, n); }
  box(x, y, z, sx, sy, sz, color = C.stone, mat = 0, em = 0, rotation = 0) {
    const ca = Math.cos(rotation), sa = Math.sin(rotation), t = ([a, b, c]) => [x + a * ca + c * sa, y + b, z - a * sa + c * ca], X = sx / 2, Y = sy / 2, Z = sz / 2;
    const p = [[-X, -Y, -Z], [X, -Y, -Z], [X, Y, -Z], [-X, Y, -Z], [-X, -Y, Z], [X, -Y, Z], [X, Y, Z], [-X, Y, Z]].map(t);
    for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]]) this.quad(...f.map(i => p[i]), color, mat, em);
  }
  tube(a, b, r0, r1, color = C.metal, mat = 1, segments = 10, em = 0) {
    const axis = norm(b.map((v, i) => v - a[i])), u = norm(cross(axis, Math.abs(axis[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), v = cross(axis, u);
    const ring = (c, r, angle) => c.map((p, i) => p + r * (u[i] * Math.cos(angle) + v[i] * Math.sin(angle)));
    for (let i = 0; i < segments; i++) { const a0 = i * TAU / segments, a1 = (i + 1) * TAU / segments, p = [ring(a, r0, a0), ring(a, r0, a1), ring(b, r1, a1), ring(b, r1, a0)]; this.quad(...p, color, mat, em); this.tri(a, p[1], p[0], color, mat, em); this.tri(b, p[3], p[2], color, mat, em); }
  }
  cylinder(x, y, z, radius, height, color = C.stone, mat = 0, segments = 12, topRadius = radius, em = 0) { this.tube([x, y - height / 2, z], [x, y + height / 2, z], radius, topRadius, color, mat, segments, em); }
  sphere(x, y, z, r, color, mat = 1, em = 0, segments = 12, rows = 8, scale = [1, 1, 1]) {
    const p = (i, j) => { const a = i * TAU / segments, b = j * PI / rows; return [x + r * Math.sin(b) * Math.cos(a) * scale[0], y + r * Math.cos(b) * scale[1], z + r * Math.sin(b) * Math.sin(a) * scale[2]]; };
    for (let j = 0; j < rows; j++) for (let i = 0; i < segments; i++) this.quad(p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1), color, mat, em);
  }
  ring(x, y, z, inner, outer, color, mat = 4, em = 1, alpha = 1, segments = 48, progress = 1) {
    for (let i = 0; i < segments * progress; i++) { const a = i * TAU / segments, b = Math.min(i + 1, segments * progress) * TAU / segments; this.quad([x + inner * Math.cos(a), y, z + inner * Math.sin(a)], [x + outer * Math.cos(a), y, z + outer * Math.sin(a)], [x + outer * Math.cos(b), y, z + outer * Math.sin(b)], [x + inner * Math.cos(b), y, z + inner * Math.sin(b)], color, mat, em, alpha, [0, 1, 0]); }
  }
  disc(x, y, z, rx, rz, color, mat = 8, alpha = .35, segments = 24) { for (let i = 0; i < segments; i++) { const a = i * TAU / segments, b = (i + 1) * TAU / segments; this.tri([x, y, z], [x + Math.cos(a) * rx, y, z + Math.sin(a) * rz], [x + Math.cos(b) * rx, y, z + Math.sin(b) * rz], color, mat, mat === 9 ? 1 : 0, alpha, [0, 1, 0]); } }
  arch(x, z, radius, spring, thickness, depth, color = C.edge) {
    const n = 20;
    for (let i = 0; i < n; i++) { const a = i * PI / n, b = (i + .94) * PI / n, point = (r, t, dz) => [x + Math.cos(t) * r, spring + Math.sin(t) * r, z + dz];
      const f = [point(radius, a, -depth / 2), point(radius + thickness, a, -depth / 2), point(radius + thickness, b, -depth / 2), point(radius, b, -depth / 2)];
      const back = f.map(p => [p[0], p[1], p[2] + depth]);
      this.quad(...f, color, 0); this.quad(back[3], back[2], back[1], back[0], color, 0);
      this.quad(f[0], f[3], back[3], back[0], C.dark, 0); this.quad(f[1], back[1], back[2], f[2], color, 0); this.quad(f[0], back[0], back[1], f[1], color, 0); this.quad(f[3], f[2], back[2], back[3], color, 0);
    }
  }
  data() { return new Float32Array(this.v); }
}

const VS = `
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; attribute vec3 aMaterial;
uniform mat4 uVP; uniform mat4 uLightVP;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vColor; varying vec3 vMaterial; varying vec4 vShadow;
void main(){vWorld=aPosition;vNormal=aNormal;vColor=aColor;vMaterial=aMaterial;vShadow=uLightVP*vec4(aPosition,1.0);gl_Position=uVP*vec4(aPosition,1.0);}`;
const FS = `
precision highp float;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vColor;varying vec3 vMaterial;varying vec4 vShadow;
uniform vec2 uCutawayCenter;uniform vec2 uCutawayRadius;uniform float uCutawayDepth;
uniform vec3 uEye;uniform vec3 uLightPosition[8];uniform vec3 uLightColor[8];uniform float uTime;uniform float uShadowTexel;uniform vec2 uResolution;uniform sampler2D uShadow;uniform sampler2D uMaterialAtlas;uniform float uMaterialReady;uniform vec3 uAmbient;uniform vec3 uKey;uniform vec3 uFog;uniform float uFogDensity;
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float unpackDepth(vec4 c){return dot(c,vec4(1.0/16777216.0,1.0/65536.0,1.0/256.0,1.0));}
float shade(){vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.x<.001||p.x>.999||p.y<.001||p.y>.999||p.z<0.0||p.z>1.0)return 1.0;float s=0.0;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=unpackDepth(texture2D(uShadow,p.xy+vec2(float(x),float(y))*uShadowTexel));s+=p.z-.0028>d?.38:1.0;}return s/9.0;}
void main(){
 float material=vMaterial.x,emission=vMaterial.y,alpha=vMaterial.z;
 // The local window follows the actual billboard plane, not a vertical actor
 // proxy. Floors, water, translucent effects and every unflagged scene keep
 // their ordinary depth. Opaque walls remain intact beyond this small ellipse.
 if(uCutawayRadius.x>1.0&&alpha>.999&&material<7.5&&!(material>2.5&&material<3.5)&&vWorld.y>.35&&gl_FragCoord.z<uCutawayDepth-.000015){
  float cut=length((gl_FragCoord.xy-uCutawayCenter)/uCutawayRadius);
  if(cut<.94)discard;
  if(cut<1.0&&hash(vec3(floor(gl_FragCoord.xy),0.0))>smoothstep(.94,1.0,cut))discard;
 }
 if(material>7.5&&material<8.5){gl_FragColor=vec4(vColor,alpha);return;}
 if(material>8.5){gl_FragColor=vec4(vColor,alpha);return;}
 vec3 n=normalize(vNormal),view=normalize(uEye-vWorld),base=vColor;
 float grit=noise(vWorld*7.0),grain=noise(vWorld*33.0),rough=.75;
 if(material<.5){
  vec2 uv=abs(n.y)>.65?vWorld.xz:abs(n.x)>.65?vWorld.zy:vWorld.xy;
  float row=floor(uv.y*1.8),mortarX=step(.96,fract(uv.x*.9+mod(row,2.0)*.5)),mortarY=step(.94,fract(uv.y*1.8));
  float masonry=max(mortarX,mortarY)*.18;float damp=(1.0-smoothstep(.0,1.6,vWorld.y))*.12;
  base*=.80+.24*grit+.08*grain-masonry-damp;base=mix(base,vec3(.12,.24,.21),damp*.5);
 }else if(material<1.5){base*=.85+.2*grit;rough=.28;}
 else if(material<2.5){base*=.8+.3*noise(vWorld*vec3(5.0,1.0,35.0));rough=.8;}
 else if(material<3.5){
  float a=sin(vWorld.x*3.2+uTime*.8+sin(vWorld.z*2.3-uTime*.6)),b=sin(vWorld.z*4.8-uTime*.9+sin(vWorld.x*2.1));
  n=normalize(vec3(a*.1,1.0,b*.09));float ripple=pow(max(0.0,sin(vWorld.x*5.5+vWorld.z*3.6+uTime*.7)*sin(vWorld.z*6.0-vWorld.x*2.1-uTime*.8)),7.0);
  float fresnel=pow(1.0-max(0.0,dot(n,view)),3.0);base=mix(vec3(.015,.12,.15),vec3(.10,.38,.38),fresnel)+vec3(.08,.30,.22)*ripple;rough=.09;
 }else if(material>4.5&&material<5.5){rough=.8;}
 else if(material>5.5&&material<6.5){base*=.85+.15*grain;rough=.9;}
 if(uMaterialReady>.5&&(material<1.5||material>6.1&&material<7.5)){
  vec2 planar=abs(n.y)>.65?vWorld.xz:abs(n.x)>.65?vWorld.zy:vWorld.xy;
  float tileScale=material>.5&&material<1.5?.65:material>6.1?.32:abs(n.y)>.65?.3125:.38;
  vec2 tile=fract(planar*tileScale),quadrant=material>6.1?vec2(.5,.5):material>.5?vec2(0.,.5):abs(n.y)>.65?vec2(0.,0.):vec2(.5,0.);
  vec2 uv=quadrant+vec2(.002)+tile*.496;vec3 detail=texture2D(uMaterialAtlas,uv).rgb;
  float h0=dot(detail,vec3(.299,.587,.114)),hx=dot(texture2D(uMaterialAtlas,uv+vec2(.0012,0.)).rgb,vec3(.299,.587,.114)),hy=dot(texture2D(uMaterialAtlas,uv+vec2(0.,.0012)).rgb,vec3(.299,.587,.114));
  vec3 tangent=abs(n.y)>.65?vec3(1.,0.,0.):abs(n.x)>.65?vec3(0.,0.,1.):vec3(1.,0.,0.);vec3 bitangent=normalize(cross(n,tangent));n=normalize(n+tangent*(h0-hx)*1.7+bitangent*(h0-hy)*1.7);
  vec3 tint=clamp(vColor*1.7,vec3(.42),vec3(1.15));base=pow(detail,vec3(1.22))*mix(vec3(1.),tint,.28);rough=material>.5&&material<1.5?.3:.86;
 }
 vec3 lighting=uAmbient;vec3 key=normalize(vec3(-.45,.85,.35));float shadow=shade();
 lighting+=uKey*max(0.0,dot(n,key))*shadow;
 vec3 spec=vec3(0.0);
 for(int i=0;i<8;i++){vec3 delta=uLightPosition[i]-vWorld;float d2=dot(delta,delta);vec3 l=normalize(delta);float falloff=1.0/(1.0+d2*.19);float lambert=max(0.0,dot(n,l));lighting+=uLightColor[i]*lambert*falloff*2.6;vec3 halfV=normalize(l+view);spec+=uLightColor[i]*pow(max(0.0,dot(n,halfV)),mix(88.0,10.0,rough))*falloff*(1.0-rough)*1.6;}
 float rim=pow(1.0-max(0.0,dot(n,view)),3.0)*.12;
 vec3 col=base*lighting+spec+base*emission*2.5+vec3(.08,.18,.18)*rim;
 if(material>2.5&&material<3.5){col+=vec3(.015,.12,.10);float glint=pow(max(0.0,dot(reflect(-key,n),view)),48.0);col+=vec3(.32,.56,.50)*glint;}
 float distance=length(uEye-vWorld);float fog=clamp(1.0-exp(-distance*distance*uFogDensity),0.0,.80);col=mix(col,uFog,fog);
 col=vec3(1.0)-exp(-col*1.12);col=pow(max(col,vec3(0.0)),vec3(.4545));
 vec2 uv=gl_FragCoord.xy/uResolution;float vignette=1.0-.18*dot((uv-.5)*1.4,(uv-.5)*1.4);col*=vignette;
 gl_FragColor=vec4(col,alpha);
}`;
const SHADOW_VS = `attribute vec3 aPosition;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aPosition,1.0);}`;
const SHADOW_FS = `precision highp float;void main(){vec4 d=fract(gl_FragCoord.z*vec4(16777216.0,65536.0,256.0,1.0));d-=d.xxyz*vec4(0.0,1.0/256.0,1.0/256.0,1.0/256.0);gl_FragColor=d;}`;

function compile(gl, type, text) { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error('The dungeon graphics shader could not start: ' + e); } return s; }
function program(gl, vertex, fragment) { const p = gl.createProgram(), vs = compile(gl, gl.VERTEX_SHADER, vertex), fs = compile(gl, gl.FRAGMENT_SHADER, fragment); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p); gl.deleteShader(vs); gl.deleteShader(fs); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { const e = gl.getProgramInfoLog(p); gl.deleteProgram(p); throw new Error('The dungeon renderer could not link: ' + e); } return p; }

export class CisternRenderer {
  constructor(canvas, { quality = 'auto', art = {}, onLost = () => {}, onRestored = () => {} } = {}) {
    this.canvas = canvas; this.art=art||{};this.spriteTextures=new WeakMap();this.sprites=[];this.zoom = 1.35; this.quality = quality; this.onLost = onLost; this.onRestored = onRestored; this.camera = null; this.lost = false; this.destroyed = false; this.stats = { drawCalls: 0, triangles: 0, quality: 'high' };
    this.gl = canvas.getContext('webgl', { alpha: false, antialias: true, depth: true, powerPreference: 'high-performance', preserveDrawingBuffer: false }) || canvas.getContext('experimental-webgl', { alpha: false, antialias: true });
    if (!this.gl) this.software = new CisternSoftwarePainter(canvas);
    this._lost = e => { e.preventDefault(); this.lost = true; this.onLost(); };
    this._restored = () => { try { this.lost = false; this.initialize(); this.onRestored(); } catch (e) { this.lost = true; this.onLost(e); } };
    canvas.addEventListener('webglcontextlost', this._lost); canvas.addEventListener('webglcontextrestored', this._restored);
    this.initialize(); this.resize();this.loadMaterialImage();
  }
  effectiveQuality() { return this.quality === 'low' || (this.quality === 'auto' && (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches || this.canvas.clientWidth < 760)) ? 'low' : 'high'; }
  initialize() {
    const g = this.gl;
    if (!g) { this.meshes = {}; this.makeMesh('static', this.buildArchitecture().data(), false); for (const name of ['dynamic','shadows','glow']) this.makeMesh(name,new Float32Array(0),true); return; }
    this.spriteTextures=new WeakMap();this.spriteTextureHandles=[];
    this.mainProgram = program(g, VS, FS); this.shadowProgram = program(g, SHADOW_VS, SHADOW_FS);
    this.locations = { pos: g.getAttribLocation(this.mainProgram, 'aPosition'), norm: g.getAttribLocation(this.mainProgram, 'aNormal'), color: g.getAttribLocation(this.mainProgram, 'aColor'), material: g.getAttribLocation(this.mainProgram, 'aMaterial') };
    this.uniforms = {}; for (const n of ['uVP', 'uLightVP', 'uEye', 'uLightPosition[0]', 'uLightColor[0]', 'uTime', 'uShadowTexel', 'uResolution', 'uShadow','uMaterialAtlas','uMaterialReady','uAmbient','uKey','uFog','uFogDensity','uCutawayCenter','uCutawayRadius','uCutawayDepth']) this.uniforms[n] = g.getUniformLocation(this.mainProgram, n);
    this.shadowPosition = g.getAttribLocation(this.shadowProgram, 'aPosition'); this.shadowVP = g.getUniformLocation(this.shadowProgram, 'uVP');
    this.meshes = {}; this.makeMesh('static', this.buildArchitecture().data(), false); this.makeMesh('dynamic', new Float32Array(0), true); this.makeMesh('shadows', new Float32Array(0), true); this.makeMesh('glow', new Float32Array(0), true);
    this.materialTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.materialTexture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,1,1,0,g.RGBA,g.UNSIGNED_BYTE,new Uint8Array([160,160,160,255]));this.configureTexture();if(this.materialImage)this.uploadMaterial();
    this.initializeSprites();this.createShadowTarget(); g.enable(g.DEPTH_TEST); g.depthFunc(g.LEQUAL); g.disable(g.CULL_FACE);
  }
  makeMesh(name, data, dynamic) { const g = this.gl; if (!g) { this.meshes[name] = {data,count:data.length/12,dynamic}; return; } const old = this.meshes[name]; if (old) g.deleteBuffer(old.buffer); const buffer = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, buffer); g.bufferData(g.ARRAY_BUFFER, data, dynamic ? g.DYNAMIC_DRAW : g.STATIC_DRAW); this.meshes[name] = { buffer, data, count: data.length / 12, dynamic }; }
  updateMesh(name, geo) { const g = this.gl, m = this.meshes[name], data = geo.data(); m.data=data;m.count=data.length/12;if(!g)return;g.bindBuffer(g.ARRAY_BUFFER, m.buffer); g.bufferData(g.ARRAY_BUFFER, data, g.DYNAMIC_DRAW); m.count = data.length / 12; }
  createShadowTarget() {
    const g = this.gl; if (!g) return; if (this.shadowTexture) g.deleteTexture(this.shadowTexture); if (this.shadowDepth) g.deleteRenderbuffer(this.shadowDepth); if (this.shadowTarget) g.deleteFramebuffer(this.shadowTarget);
    this.shadowSize = this.effectiveQuality() === 'low' ? 512 : 1024;
    this.shadowTexture = g.createTexture(); g.bindTexture(g.TEXTURE_2D, this.shadowTexture); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, this.shadowSize, this.shadowSize, 0, g.RGBA, g.UNSIGNED_BYTE, null); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    this.shadowDepth = g.createRenderbuffer(); g.bindRenderbuffer(g.RENDERBUFFER, this.shadowDepth); g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT16, this.shadowSize, this.shadowSize);
    this.shadowTarget = g.createFramebuffer(); g.bindFramebuffer(g.FRAMEBUFFER, this.shadowTarget); g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, this.shadowTexture, 0); g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, this.shadowDepth);
    if (g.checkFramebufferStatus(g.FRAMEBUFFER) !== g.FRAMEBUFFER_COMPLETE) throw new Error('The dungeon lighting surface could not be created.'); g.bindFramebuffer(g.FRAMEBUFFER, null);
  }
  setZoom(value) { const next=clamp(Number(value)||1,.65,1.8);if(next!==this.zoom)this.forceRender=true;this.zoom=next; }
  setQuality(value) { this.quality = ['high', 'low'].includes(value) ? value : 'auto'; this.forceRender=true;if (!this.lost) { this.createShadowTarget(); this.resize(); } }
  resize() { if (this.destroyed) return; const rect = this.canvas.getBoundingClientRect(), low = this.effectiveQuality() === 'low', ratio = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, this.software ? 1 : low ? 1.25 : 1.75); const w = Math.max(1, Math.round(rect.width * ratio)), h = Math.max(1, Math.round(rect.height * ratio)); if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.forceRender=true; } this.stats.quality = low ? 'low' : 'high'; }
  buildArchitecture() { return buildCisternArchitecture(Geometry,C,CISTERN); }
  loadMaterialImage(){
    if(typeof Image==='undefined')return;const image=new Image();let retry=false;
    image.onload=()=>{if(this.destroyed)return;this.materialImage=image;this.forceRender=true;if(this.gl&&!this.lost)this.uploadMaterial();};
    image.onerror=()=>{if(this.destroyed)return;if(!retry){retry=true;image.src=new URL('./art/cistern/material-atlas-v2.jpg',import.meta.url).href;}};
    image.src=new URL('./art/cistern/material-atlas-v2.webp',import.meta.url).href;
  }
  configureTexture(){const g=this.gl;g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);}
  uploadMaterial(){
    const g=this.gl;if(!g||!this.materialImage)return;let source=this.materialImage;
    // Power-of-two storage permits prefiltered mipmaps in WebGL1. The original
    // image remains available to the software renderer at its delivered size.
    if(typeof document!=='undefined'){const tile=document.createElement('canvas');tile.width=tile.height=1024;const c=tile.getContext('2d');if(c){c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(source,0,0,1024,1024);source=tile;}}
    g.bindTexture(g.TEXTURE_2D,this.materialTexture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,source);this.configureTexture();
    const w=source.width,h=source.height;if(w>0&&h>0&&(w&(w-1))===0&&(h&(h-1))===0){g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);const ext=g.getExtension?.('EXT_texture_filter_anisotropic')||g.getExtension?.('WEBKIT_EXT_texture_filter_anisotropic');if(ext)g.texParameterf(g.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(4,g.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)||1));}
    this.materialReady=true;
  }
  sprite(kind,col,row,x,z,bodyHeight,flip=false,alpha=1){
    const image=this.art.assets?.[kind];if(!image?.width)return null;
    const cols=['crew','run','starter'].includes(kind)?8:kind==='bestiary3'?6:4,rows=kind==='crew'||kind==='run'?7:kind==='starter'?2:kind==='creatures'?6:kind==='npcs'||kind==='bestiary3'?4:3;
    const source=this.art.bounds?.[kind]?.[row*cols+col]||{x:col*image.width/cols,y:row*image.height/rows,w:image.width/cols,h:image.height/rows};
    if(!(source.w>0&&source.h>0))return null;const registration=this.art.registrations?.[kind]?.[row],scale=bodyHeight/(registration?.height||source.bodyHeight||source.h);
    return {image,source,x,y:.045,z,width:source.w*scale,height:source.h*scale,anchorX:(source.anchorX??source.w/2)/source.w,anchorY:(source.anchorY??source.h)/source.h,flip,alpha};
  }
  buildDynamic(state, party) {
    const m=new Geometry(),shadows=new Geometry(),glow=new Geometry(),time=state.time||0,p=state.player||{x:0,z:12};
    this.sprites=[];party=party.filter(h=>h&&h.hp>0);
    const back=Math.cos(p.facing??PI)<-.32,left=Math.sin(p.facing??PI)<-.2,step=Math.floor(time*8)%4;
    const addHero=(hero,x,z,i)=>{const kind=p.moving&&this.art.assets?.run?'run':'crew',col=p.moving?(kind==='run'?(back?4:0)+step:(back?5:0)+[0,1,2,1][step]):back?5:0;const sprite=this.sprite(kind,col,hero?.id||0,x,z,2.05,spriteFacingFlip(kind,col,left,hero?.id||0));if(sprite)this.sprites.push(sprite);shadows.disc(x,.065,z,.42,.29,[0,.015,.02],8,.62);};
    addHero(party[0],p.x,p.z,0);
    for(let i=1;i<Math.min(3,party.length);i++){const f=state.followers?.[i-1];let x=Number.isFinite(f?.x)?f.x:p.x+(i===1?-.65:.65),z=Number.isFinite(f?.z)?f.z:p.z+.85;if(!cisternWalkable(x,z,state)){x=p.x;z=p.z;}addHero(party[i],x,z,i);}
    if(state.guard)glow.ring(p.x,.08,p.z,.59,.66,C.teal,9,1,.45);
    for(const e of state.enemies||[]){if(!(e.hp>0))continue;const boss=e.boss||e.type==='guardian';let sprite=boss?this.sprite('creatures',e.telegraph?1:e.stagger>0?2:0,4,e.x,e.z,3.8):this.sprite('bestiary',2,0,e.x,e.z,1.30,e.x>p.x);if(!sprite&&!boss)sprite=this.sprite('creatures',e.telegraph?1:0,0,e.x,e.z,1.3);if(sprite)this.sprites.push(sprite);shadows.disc(e.x,.065,e.z,boss?1.25:.56,boss?.85:.36,[0,.015,.02],8,.65);if(e.telegraph){const t=e.telegraph,r=t.radius||1.5,progress=1-(t.remaining||0)/(t.duration||1);glow.disc(t.x,.08,t.z,r,r,rgb('#d94428'),9,.08);glow.ring(t.x,.085,t.z,r-.055,r+.055,rgb('#f0754c'),9,1,.7);glow.ring(t.x,.09,t.z,r*.88,r*.93,C.warm,9,1,.8,48,clamp(progress,0,1));}}
    for(let i=0;i<2;i++){const x=i?8:-8,active=!!state.resonators?.[i],col=active?C.teal:C.warm;m.sphere(x,1.42+Math.sin(time*2+i)*.04,-5,.15,col,4,active?1.15:.4,10,6);glow.ring(x,.08,-5,.92,1.01,col,9,1,active?.6:.18);}
    if(!state.resonators?.every(Boolean)){for(let x=-1.75;x<2;x+=.5)m.box(x,1.3,-14,.085,2.6,.1,C.brass,1);for(const y of [.25,1.3,2.5])m.box(0,y,-14,4,.13,.17,C.metal,1);}else glow.ring(0,.075,-14,1.25,1.35,C.teal,9,1,.3);
    for(let i=0;i<TORCHES.length;i++){const[x,y,z]=TORCHES[i],pulse=.85+.15*Math.sin(time*9+i*2.6);m.sphere(x,y+.13,z,.12,C.warm,4,1.4,6,4,[.65,1.6*pulse,.65]);m.sphere(x,y+.08,z,.065,rgb('#fff1b5'),4,2,6,4,[.8,1.6,.8]);}
    for(let i=0;i<(this.effectiveQuality()==='low'?12:26);i++){const x=Math.sin(i*13.71)*9.7,z=-5+Math.cos(i*5.21)*8.3,y=.28+((i*.371+time*.035)%1)*3.6;m.sphere(x+Math.sin(time*.3+i)*.15,y,z,.01,C.teal,4,.35,4,3);}
    for(const effect of state.effects||[]){const q=clamp((effect.t||0)/(effect.life||.4),0,1),r=(effect.radius||1)*(.35+q*.85),col=effect.type==='mako'?C.teal:effect.type==='impact'?rgb('#ff674d'):C.warm;glow.ring(effect.x,.10,effect.z,Math.max(0,r-.11),r,col,9,1,(1-q)*.65);}
    if(state.bossDefeated){glow.ring(0,.075,-24,2.2,2.3,C.teal,9,1,.35);m.sphere(0,1+Math.sin(time)*.12,-24,.23,C.teal,4,1.5,10,8);}
    appendCisternCraftDynamics(m,glow,state,time);
    this.updateMesh('dynamic',m);this.updateMesh('shadows',shadows);this.updateMesh('glow',glow);
  }
  initializeSprites(){const g=this.gl;this.spriteProgram=program(g,`attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uVP;varying vec2 vUV;void main(){vUV=aUV;gl_Position=uVP*vec4(aPosition,1.);}`,`precision mediump float;varying vec2 vUV;uniform sampler2D uSprite;uniform vec3 uTint;uniform float uAlpha;void main(){vec4 col=texture2D(uSprite,vUV);if(col.a<.06)discard;gl_FragColor=vec4(col.rgb*uTint,col.a*uAlpha);}`);this.spriteBuffer=g.createBuffer();this.spriteLocations={position:g.getAttribLocation(this.spriteProgram,'aPosition'),uv:g.getAttribLocation(this.spriteProgram,'aUV'),vp:g.getUniformLocation(this.spriteProgram,'uVP'),texture:g.getUniformLocation(this.spriteProgram,'uSprite'),tint:g.getUniformLocation(this.spriteProgram,'uTint'),alpha:g.getUniformLocation(this.spriteProgram,'uAlpha')};}
  drawSprites(){const g=this.gl;if(!this.sprites.length)return;const basis=this.unframedVP||this.vp,right=norm([basis[0],basis[4],basis[8]]),up=norm([basis[1],basis[5],basis[9]]),loc=this.spriteLocations;g.useProgram(this.spriteProgram);g.uniformMatrix4fv(loc.vp,false,this.vp);g.uniform1i(loc.texture,2);for(const a of Object.values(this.locations))if(a>=0)g.disableVertexAttribArray(a);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.depthMask(true);g.activeTexture(g.TEXTURE2);
    for(const sprite of this.sprites){let texture=this.spriteTextures.get(sprite.image);if(!texture){texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,texture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,sprite.image);this.configureTexture();this.spriteTextures.set(sprite.image,texture);this.spriteTextureHandles.push(texture);}else g.bindTexture(g.TEXTURE_2D,texture);const src=sprite.source,iw=sprite.image.width,ih=sprite.image.height,u0=src.x/iw,u1=(src.x+src.w)/iw,v0=src.y/ih,v1=(src.y+src.h)/ih,ax=sprite.flip?1-sprite.anchorX:sprite.anchorX,ay=sprite.anchorY;const point=(u,v)=>[sprite.x+right[0]*(u-ax)*sprite.width+up[0]*(ay-v)*sprite.height,sprite.y+right[1]*(u-ax)*sprite.width+up[1]*(ay-v)*sprite.height,sprite.z+right[2]*(u-ax)*sprite.width+up[2]*(ay-v)*sprite.height];const out=[];for(const[u,v]of [[0,1],[1,1],[1,0],[0,1],[1,0],[0,0]])out.push(...point(u,v),sprite.flip?(u?u0:u1):(u?u1:u0),v?v1:v0);g.bindBuffer(g.ARRAY_BUFFER,this.spriteBuffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(out),g.DYNAMIC_DRAW);g.enableVertexAttribArray(loc.position);g.vertexAttribPointer(loc.position,3,g.FLOAT,false,20,0);g.enableVertexAttribArray(loc.uv);g.vertexAttribPointer(loc.uv,2,g.FLOAT,false,20,12);const tint=resolveActorTint(sprite.tint,[.94,.96,.95]);g.uniform3f(loc.tint,...tint);g.uniform1f(loc.alpha,sprite.alpha??1);g.drawArrays(g.TRIANGLES,0,6);this.stats.drawCalls++;this.stats.triangles+=2;}g.disableVertexAttribArray(loc.uv);g.disable(g.BLEND);
  }
  bindMesh(mesh, shadow = false) {
    const g = this.gl; g.bindBuffer(g.ARRAY_BUFFER, mesh.buffer);
    if (shadow) { for (const loc of Object.values(this.locations)) if(loc>=0 && loc!==this.shadowPosition)g.disableVertexAttribArray(loc); g.enableVertexAttribArray(this.shadowPosition); g.vertexAttribPointer(this.shadowPosition, 3, g.FLOAT, false, 48, 0); }
    else for (const [name, offset] of [['pos', 0], ['norm', 12], ['color', 24], ['material', 36]]) { const a = this.locations[name]; if (a >= 0) { g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 3, g.FLOAT, false, 48, offset); } }
    g.drawArrays(g.TRIANGLES, 0, mesh.count); this.stats.drawCalls++; this.stats.triangles += mesh.count / 3;
  }
  frameProjection(vp){return vp;}
  getCameraFrame(){return null;}
  getClearColor(){return [.025,.060,.077];}
  getSoftwareLighting(){return undefined;}
  getSoftwareLights(){return undefined;}
  getLighting(){return {ambient:[.11,.145,.16],key:[.42,.45,.42],fog:[.012,.029,.034]};}
  getLights(state,p,time){
    const lights=TORCHES.map((t,i)=>({p:[t[0],t[1]+.2,t[2]],c:[1.35,.63,.22],d:Math.hypot(t[0]-p.x,t[2]-p.z),i}));
    for(let i=0;i<2;i++)lights.push({p:[i?8:-8,1.6,-5],c:state.resonators?.[i]?[.12,1.2,.95]:[.65,.32,.10],d:Math.hypot((i?8:-8)-p.x,-5-p.z),i:20+i});
    lights.push({p:[0,.9,-5],c:[.08,.63,.62],d:Math.hypot(p.x,p.z+5),i:30});
    return lights.sort((a,b)=>a.d-b.d).slice(0,8).map(l=>({...l,c:l.c.map(n=>n*(.95+.05*Math.sin(time*7+l.i*2)))}));
  }
  render(state, party = [], dt = 0) {
    if (this.destroyed || this.lost || !state) return;
    this.resize(); const g = this.gl, p = state.player || { x: 0, z: 12 }, time = state.time || 0;
    // Leave the event loop room for controls and accessibility on CPU-only browsers.
    if(this.software&&!this.forceRender&&(time===this.softwareFrameTime||this.softwarePaintEnd!==undefined&&performance.now()-this.softwarePaintEnd<28))return;
    if (!this.camera) this.camera = { x: p.x, z: p.z };
    const ease = 1 - Math.exp(-Math.min(.1, Math.max(.016, dt || .016)) * 7); this.camera.x += (p.x - this.camera.x) * ease; this.camera.z += (p.z - this.camera.z) * ease;
    const aspect = this.canvas.width / this.canvas.height, distance = (aspect < .8 ? 17 : 14.6) / this.zoom;
    const defaultEye=[this.camera.x+distance*.22,distance*.75,this.camera.z+distance*.78],defaultAt=[this.camera.x,.55,this.camera.z-1.8],frame=this.getCameraFrame(state,p,aspect,distance);
    const validPoint=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite),custom=validPoint(frame?.eye)&&validPoint(frame?.at)&&Math.hypot(...frame.eye.map((v,i)=>v-frame.at[i]))>.1;
    const eye=custom?frame.eye:defaultEye,at=custom?frame.at:defaultAt,fov=Number.isFinite(frame?.fov)&&frame.fov>.25&&frame.fov<2.4?frame.fov:PI/3.4;
    this.eye = eye; this.vp = mul(perspective(fov, aspect, .15, 100), lookAt(eye, at));this.unframedVP=this.vp;this.vp=this.frameProjection(this.vp,{state,party,aspect,eye,at})||this.vp; this.inverseVP = inverse(this.vp);
    const center = [p.x, 0, p.z - 3], lightEye = [center[0] - 12, 23, center[2] + 10], lightVP = mul(ortho(-19, 19, -19, 19, 1, 60), lookAt(lightEye, center));
    
    this.buildDynamic(state, party); this.stats.drawCalls = 0; this.stats.triangles = 0;
    this.cutaway=leadCutawayWindow({state,sprites:this.sprites,vp:this.vp,billboardVP:this.unframedVP,width:this.canvas.width,height:this.canvas.height});
    const sceneLights=this.getLights(state,p,time),lighting=this.getLighting(state,p,time);
    if(!g){ const result=this.software.render({meshes:this.meshes,vp:this.vp,billboardVP:this.unframedVP,eye,time,state,quality:this.effectiveQuality(),materialImage:this.materialImage,sprites:this.sprites,art:this.art,lights:this.getSoftwareLights(state,p,time,sceneLights),lighting:this.getSoftwareLighting(state,p,time,lighting)});Object.assign(this.stats,result,{quality:this.effectiveQuality()});this.softwareFrameTime=time;this.softwarePaintEnd=performance.now();this.forceRender=false;return;}
    this.stats.backend='webgl';
    g.disable(g.BLEND); g.depthMask(true); g.bindFramebuffer(g.FRAMEBUFFER, this.shadowTarget); g.viewport(0, 0, this.shadowSize, this.shadowSize); g.clearColor(1, 1, 1, 1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT); g.useProgram(this.shadowProgram); g.uniformMatrix4fv(this.shadowVP, false, lightVP); this.bindMesh(this.meshes.static, true); this.bindMesh(this.meshes.dynamic, true);
    g.bindFramebuffer(g.FRAMEBUFFER, null); g.viewport(0, 0, this.canvas.width, this.canvas.height); g.clearColor(...this.getClearColor(lighting),1); g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT); g.useProgram(this.mainProgram);
    g.uniformMatrix4fv(this.uniforms.uVP, false, this.vp); g.uniformMatrix4fv(this.uniforms.uLightVP, false, lightVP); g.uniform3fv(this.uniforms.uEye, eye); g.uniform1f(this.uniforms.uTime, time); g.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height); g.uniform1f(this.uniforms.uShadowTexel, 1 / this.shadowSize);
    const positions=[],colors=[];for(const l of sceneLights.slice(0,8)){positions.push(...l.p);colors.push(...l.c);}while(positions.length<24){positions.push(0,0,0);colors.push(0,0,0);}
    g.uniform3fv(this.uniforms.uAmbient,new Float32Array(lighting.ambient));g.uniform3fv(this.uniforms.uKey,new Float32Array(lighting.key));g.uniform3fv(this.uniforms.uFog,new Float32Array(lighting.fog));g.uniform1f(this.uniforms.uFogDensity,lighting.fogDensity??.00065);
    g.uniform3fv(this.uniforms['uLightPosition[0]'], new Float32Array(positions)); g.uniform3fv(this.uniforms['uLightColor[0]'], new Float32Array(colors)); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, this.shadowTexture); g.uniform1i(this.uniforms.uShadow, 0);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.materialTexture);g.uniform1i(this.uniforms.uMaterialAtlas,1);g.uniform1f(this.uniforms.uMaterialReady,this.materialReady?1:0);
    const cut=this.cutaway;g.uniform2f(this.uniforms.uCutawayCenter,cut?.cx||0,cut?this.canvas.height-cut.cy:0);g.uniform2f(this.uniforms.uCutawayRadius,cut?.rx||0,cut?.ry||0);g.uniform1f(this.uniforms.uCutawayDepth,cut?.depthZ??-1);
    this.bindMesh(this.meshes.static);
    g.enable(g.BLEND); g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA); g.depthMask(false); this.bindMesh(this.meshes.shadows); g.depthMask(true); g.disable(g.BLEND); this.bindMesh(this.meshes.dynamic);
    g.enable(g.BLEND); g.blendFunc(g.SRC_ALPHA, g.ONE); g.depthMask(false); this.bindMesh(this.meshes.glow); g.depthMask(true); g.disable(g.BLEND);this.drawSprites();
  }
  screenToGround(clientX, clientY) {
    if (!this.inverseVP) return null; const r = this.canvas.getBoundingClientRect(); if (!r.width || !r.height) return null;
    const x = (clientX - r.left) / r.width * 2 - 1, y = 1 - (clientY - r.top) / r.height * 2, a = transform(this.inverseVP, [x, y, -1, 1]), b = transform(this.inverseVP, [x, y, 1, 1]);
    for (let i = 0; i < 3; i++) { a[i] /= a[3]; b[i] /= b[3]; } const dy = b[1] - a[1]; if (Math.abs(dy) < 1e-8) return null; const t = -a[1] / dy; if (t < 0) return null; return { x: a[0] + (b[0] - a[0]) * t, z: a[2] + (b[2] - a[2]) * t };
  }
  destroy() { if (this.destroyed) return; this.destroyed = true; this.canvas.removeEventListener('webglcontextlost', this._lost); this.canvas.removeEventListener('webglcontextrestored', this._restored); const g = this.gl; if(this.software){this.software.destroy();return;} if (!this.lost) { for (const m of Object.values(this.meshes || {})) g.deleteBuffer(m.buffer); for(const texture of this.spriteTextureHandles||[])g.deleteTexture(texture);g.deleteProgram(this.spriteProgram);g.deleteBuffer(this.spriteBuffer);g.deleteTexture(this.materialTexture);g.deleteProgram(this.mainProgram); g.deleteProgram(this.shadowProgram); g.deleteTexture(this.shadowTexture); g.deleteRenderbuffer(this.shadowDepth); g.deleteFramebuffer(this.shadowTarget); } }
}

export {Geometry,C};
