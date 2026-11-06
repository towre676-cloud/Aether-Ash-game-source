const PRIORITY={danger:100,action:90,reward:80,objective:70,nearby:60,status:40,lore:20};
export function selectContext(items=[],max=4){return [...items].filter(x=>!x.hidden).sort((a,b)=>(PRIORITY[b.kind]||0)-(PRIORITY[a.kind]||0)||(a.distance||0)-(b.distance||0)).slice(0,max)}
export function actionBar(ctx={}){const a=[];if(ctx.danger)a.push('guard','move');if(ctx.target)a.push('strike');if(ctx.techniques?.length)a.push(...ctx.techniques.slice(0,2));if(ctx.reward)a.push('equip');if(!a.length)a.push('interact');return [...new Set(a)].slice(0,5)}
