import {ORIGINS,originById} from './origin-content.js?v=5.18.0';

const NAMES=['Sable','Iona','Rook','Brass','Riven','Mira','Veyr'];
const validHero=id=>Number.isInteger(id)&&id>=0&&id<NAMES.length;
const chapterOf=state=>Number.isInteger(state?.chapter)?Math.max(1,Math.min(24,state.chapter)):1;

/** Narrative identity stays with the selected journey, even after a party swap. */
export function selectedJourneyLead(state={}){
 if(validHero(state?.journey?.hero))return state.journey.hero;
 const origin=originById(state?.chronicle?.originId);
 if(origin)return origin.hero;
 if(validHero(state?.chronicle?.hero))return state.chronicle.hero;
 return validHero(state?.party?.[0])?state.party[0]:0;
}
function historyFor(state,origin){
 const c=state?.chronicle;
 if(c?.originId===origin.id&&[0,1].includes(c.choices?.destiny))return c.choices.destiny;
 const records=Array.isArray(c?.records)?c.records:[];
 const record=[...records].reverse().find(r=>r?.originId===origin.id&&[0,1].includes(r.destiny));
 return record?.destiny??null;
}
function identity(state){const id=selectedJourneyLead(state);return {lead:{id,name:NAMES[id]},origin:ORIGINS.find(o=>o.hero===id)};}
function promiseFor(state,origin){
 const choice=historyFor(state,origin);
 if(choice!==null||origin.hero===0)return origin.journey.promise[choice??0];
 return [
  origin.journey.promise[0],
  'Keep Lowbank able to ask for care and reach it.',
  'Leave the people using a machine able to stop and question it.',
  'Keep a crossing open for people without rank or papers.',
  'Let the people on both banks check what the survey promises.',
  'Let the people in a record decide who may use their names.',
  'Leave room on the line for the quiet stations to answer.'
 ][origin.hero];
}
const ACT_AIMS=[
 'Free the stolen voices without leaving the city cold.',
 'Repair the lives the Crown left behind, and give people a way to answer.',
 'Build a city that can live and remember without the Choir’s command.'
];
const FESTIVAL_REASONS=[
 '',
 'Dara’s requests for care have brought Iona to Cinderfall. Rook can inspect the service line Lowbank needs.',
 'Rook needs the festival reed, then a chance to inspect the carriage regulator he built.',
 'The porter’s account of sealed carriages has brought Brass to Cinderfall. Rook can read their workshop mark.',
 'The keepers’ missing water has brought Riven to Cinderfall. Rook can compare the regulator with the service plan.',
 'Mira has brought a cylinder’s workshop mark to Rook. She needs an answer about its carrier, without exposing the people in the recording.',
 'The operators’ unanswered calls have brought Veyr down from the mast. Rook can inspect the lower connection.'
];
const CHAPTERS=[null,
 ['The Stolen Song','Nell’s father is inside the carriage. Reaching him starts the search for who is taking voices through the district’s heating works.'],
 ['The Dawn Carriage','The freed father’s docket points to the dawn train. Its passengers can lead the crew beyond the first collector.'],
 ['The Undercity Well','The carriage manifest leads to the river tests. Restoring the well gives people water while Riven’s account leads toward a witness.'],
 ['Chapel of Rain','Hesper’s witness can name who built the engine. The chapel’s return plate can show how a line once let its listeners answer.'],
 ['Names in the Archive','Hesper’s account must be proved before more people are erased. The archive links the stolen voices to orders—and to copies made after Sable’s mother died.'],
 ['The Sky Engine','Veyr authorized the transfers. His mooring office can expose the route and help find a source of heat that does not require a captive voice.'],
 ['Orchard After Fire','Corin’s living root offers another source for the reactor. Keeping it alive makes freeing the voices possible without closing the city’s warm rooms.'],
 ['The Last Reactor','The seed must carry the heat before the collector is isolated. Freeing the recordings cannot mean abandoning the households on its pipes.'],
 ['The Children of Lowbank','The central collector has stopped, but its wards still lure children. Iona’s neighbours need a rescue, not an announcement that the city is already saved.'],
 ['The Last Prison Train','Lark’s work tag names the train Brass signed out. What leaves the smoke must help both the trapped families and the account they will give afterward.'],
 ['What the River Kept','The train’s evidence exposes a planned flood. Repairing the bank must begin with the people who live there and the survey Riven signed.'],
 ['A Name Without a Number','The flood survey points to the original names. Returning them must help families find one another without handing their addresses back to collectors.'],
 ['Rook and the Unfinished House','The recovered register gives Rook his father’s address. The avoided letter can name how the machinery was built; an apology cannot do the repair by itself.'],
 ['The Daughter in the Glass','The letter leads to Veyr’s recorded child. A living child needs help outside, and the echo cannot answer for her or decide who she is.'],
 ['Sable Takes Off the Uniform','The child remembers Sable’s old checkpoint. Opening a real route for refugees is how he answers for the orders he carried without asking.'],
 ['The Mountain Learns a Song','The checkpoint still receives orders from the mountain. Separate relay voices can carry replies without forcing each settlement into one repeated phrase.'],
 ['The Observatory Below the Sky','The relays reveal the observatory. Its lens can help people cross safely and show where the network still leaves a settlement without heat.'],
 ['The Price of Warm Rooms','The lens shows people who will be cold before the crew returns. Supplying a clinic or kitchen gives the repaired lines someone living to reach.'],
 ['A Sky Full of Borrowed Wings','The warm rooms cannot help families who cannot reach them. Changing a freight crossing into a safe passage makes the relief work usable.'],
 ['The Trial of the Witnesses','A court message draws the crew to stolen testimony. The whole account must be heard, including its accusations against them, without treating witnesses as property.'],
 ['The Clay That Refused the Mold','The testimony identifies the first pottery floor. Its old marks can distinguish Mother’s chosen recording from the later copies—and expose what feeds the Choir.'],
 ['Where the Choir Takes Breath','The mold’s intake mark leads to miners still below. Turning the air outward puts living workers before the machine that uses their breath.'],
 ['The City Chooses Its Voices','The rescued workers lead to the assembly. An archive or school begins a public way to remember before anyone can inherit the Choir’s control.'],
 ['A Song With No Last Note','The city has begun answering for itself. The crew must break the Choir’s imposed unison while leaving those different voices room to continue.']
];

/** Read-only purpose for the main HUD, guidance and journal. No gates or rewards. */
export function journeyPurpose(state={}){
 state=state&&typeof state==='object'?state:{};
 const {lead,origin}=identity(state),promise=promiseFor(state,origin);
 if(state?.chronicle?.phase==='past')return {id:'origin:'+origin.id,title:origin.title,aim:origin.journey.aim,why:origin.journey.before,lead,promise};
 if(state?.complete){
  if(!state.story?.returnedHome)return {id:'homecoming',title:'The case comes home',aim:lead.id===0?'Bring the reed case home to Mara.':'Bring Sable and the reed case home to Mara.',why:'The city’s work can continue without one keeper. '+(lead.id===0?'Sable still has a promise to a living person.':lead.name+' can see that smaller promise through before returning to the work that brought them here.'),lead,promise};
  return {id:'after-homecoming',title:'A future people can answer',aim:'Keep the roads, warm rooms and places of memory open.',why:lead.name+' has come back to people who can answer. The next repair begins with what they need, not a final order from the mountain.',lead,promise};
 }
 const chapter=chapterOf(state),act=chapter<=8?0:chapter<=16?1:2,[title,reason]=CHAPTERS[chapter];
 if(chapter===1&&!state.story?.firstCore&&!((state.flags?.[8323526]||0)&2))return {id:'chapter:1',title:'One last delivery',aim:'Carry the reed to the festival and bring its case home.',why:lead.id===0?'Rook needs Sable’s mother’s tuning reed for the orchestra. Mara is waiting for Sable and the case to come back.':(historyFor(state,origin)===null?FESTIVAL_REASONS[lead.id]:origin.journey.arrival[historyFor(state,origin)])+' Sable’s delivery gives them a way to reach Rook together.',lead,promise};
 let why=reason;
 if(chapter===4&&state.answeringNetwork?.works?.includes('chapel-return'))why='The chapel has answered a pulse without repeating it. Protecting Hesper’s witness can now lead the crew to the archive that removed its names.';
 if(chapter===8&&state.answeringNetwork?.works?.includes('heat-independent'))why='The collector feed is isolated and the district heat gauge is still warm. The crew can free the recordings without making the households pay for their freedom.';
 const concern=chapter===1&&!state.story?.firstCore&&lead.id===0?'Sable promised Nell he would help her father come home.':origin.journey.concern[act];
 return {id:'chapter:'+chapter,title,aim:ACT_AIMS[act],why:why+' '+concern,lead,promise};
}

/** Called after origin state has moved into the present, never mutates the kit. */
export function journeyConvergence(state){
 const {origin}=identity(state),choice=historyFor(state,origin)??0,j=origin.journey;
 if(origin.hero===0)return [origin.present,j.arrival[choice]];
 return [j.arrival[choice],j.meeting,
  'MARA: The case comes home tonight.\nSABLE: I know.\nMARA: I’m asking about you, too.\nSable closes the reed case. '+NAMES[origin.hero]+' has a reason to find Rook; for this first stretch, they can keep the same promise.'];
}

const HOME_BEATS=[
 {after:1,id:'first-rescue',title:'A chair at home',page:'Nell’s father has left bread beside the kettle. Mara moves the plate so there is room for the reed case.\nMARA: He said you brought him back.\nSABLE: There were other carriages. I have a docket.\nMARA: Then eat before you follow it. The shelf can wait. I need you to remember where it is.',repeat:'MARA: Nell’s father left enough bread for the road. Sit down while I wrap it.'},
 {after:5,id:'copied-song',title:'What she gave them',page:'Sable lays a copied date beside the empty place on the shelf.\nSABLE: They were charging for her song after she died. Every winter.\nMARA: She meant people to hear it that first evening.\nSABLE: I thought the later date might mean—\nMARA: I know. You can tell me what you find. You do not have to make it good news before you come home.',repeat:'MARA: Bring back what the records actually say. We can bear hearing it together.'},
 {after:8,id:'after-crown',title:'The kettle is still warm',page:'Mara puts a hand near the pipe, then pours the tea.\nMARA: It stayed warm.\nSABLE: The seed held. We stopped the collector.\nMARA: And the people downstream?\nSABLE: Still waiting. I thought there would be a moment when we could say it was over.\nMARA: You can come home before everything is over. Then you can go where you are needed.',repeat:'MARA: The kettle is warm. Take a little time here before the next call.'},
 {after:15,id:'without-badge',title:'What a delivery does',page:'Mara notices the missing insignia. She does not ask where Sable put it.\nSABLE: I carried their orders. Some of the people at the gate knew the mark.\nMARA: What did you tell them?\nSABLE: That they could cross. Then I stayed until they did.\nMARA: Tell me their names, if they wanted you to know them.',repeat:'MARA: You do not need the badge to sit here. Tell me who you travelled with.'},
 {after:21,id:'one-recording',title:'Something freely left',page:'Sable sets the copied session marks on the table. This time he does not turn them face down.\nSABLE: They made copies. She never went back there.\nMARA: No.\nSABLE: I kept a place for a different answer.\nMARA: So did I.\nThey sit beside the kettle until Sable is ready to put the papers away.\nSABLE: The song she left is still hers. We do not owe it to the machine.',repeat:'MARA: The case has a place here. Whatever you decide about the song, you do too.'}
];
const passed=(state,n)=>chapterOf(state)>n||state?.bosses?.includes(n)||state?.story?.rewarded?.includes(n);
/** Existing journal IDs record visits; old saves need no additional schema. */
export function homeConversation(state={}){
 state=state&&typeof state==='object'?state:{};
 if(state.complete||state.chronicle?.phase==='past')return null;
 const beat=[...HOME_BEATS].reverse().find(b=>passed(state,b.after));if(!beat)return null;
 const id='home-visit:'+beat.id,entries=Array.isArray(state.story?.journal)?state.story.journal:[],fresh=!entries.some(e=>e.id===id),{origin}=identity(state);
 const act=beat.after<8?0:beat.after<21?1:2;
 const pages=[fresh?beat.page:beat.repeat];
 if(fresh&&origin.hero!==0&&origin.journey.home[act])pages.push(origin.journey.home[act]);
 return {id,title:beat.title,pages,fresh};
}

/** Sable's family decision remains his even when another traveller leads. */
export function homecomingPages(state={}){
 state=state&&typeof state==='object'?state:{};
 const {lead,origin}=identity(state),choice=historyFor(state,origin),recording=state.story?.finalChoice;
 const page=recording===1?'Sable puts the reed case on the shelf.\nMARA: We can listen when we want to.\nShe takes his hands.\nMARA: You came home.':recording===2?'MARA: I heard it from the square. Then, at last, the silence was ours again.\nSable sets the empty case on the shelf.\nMARA: You came home.':'Sable sets the reed case on its waiting shelf.\nMARA: You came home.';
 const pages=[page,choice===null&&lead.id!==0?origin.journey.home[2]:origin.journey.homecoming[choice??0]];
 const others=(Array.isArray(state.recruited)?state.recruited:[]).filter(id=>validHero(id)&&id!==0&&id!==lead.id);
 if(lead.id!==0||others.length)pages.push('Mara brings another cup. The travellers make room around the table; the next road can wait until the tea is poured.');
 return pages;
}

// Exact present-day passages only. A selected traveller can arrive earlier
// without moving a witness, changing a clue, or rewriting somebody else's past.
const SELECTED_LEAD_TEXT={
 1:[
  ['IONA: Stop. You’re heading for the cells?','IONA: These are the cells. We need to be ready when they open.'],
  ['IONA: Then take me. There are people in there who can barely stand.','IONA: Some of my patients are in there. They can barely stand.'],
  ['Iona joined the crew. Mend / Focus is ready.','Iona’s Mend / Focus is ready.'],
  ['Iona is waiting by the yard entrance. Ask her to come.','Iona needs the crew together at the yard entrance before the cells open.'],
  ['Meet Iona, the prison medic','Plan the rescue with Iona']
 ],
 2:[
  ['Rook is still wrestling with the orchestra.','Rook goes straight to the orchestra’s loose bridge.'],
  ["ROOK: There. One more year without a new bridge. Nell's father is singing by the lantern; go on, I'll clean up.","ROOK: There. One more year without a new bridge. Nell's father is singing by the lantern. I can leave the tools here; let's hear him."],
  ['The Kiln service is closed for the festival. Rook is waiting beside the orchestra.','The Kiln service is closed for the festival. The orchestra still needs Rook’s repair.'],
  ['MARA: Rook is at the festival orchestra. I will keep the kettle warm.','MARA: The orchestra is waiting for you both. I will keep the kettle warm.'],
  ['Rook is waiting in the Commons.','The orchestra is waiting in the Commons.'],
  ['Rook joined the crew. His repair tools are ready to use.','Rook’s repair tools are ready to use.'],
  ['Help Rook mend the festival instrument.','Mend the festival instrument with Sable.'],
  ['Help Rook with the instrument\nby the road keeper first.\nThen speak to Nell nearby.','Mend the instrument\nby the road keeper first.\nThen speak to Nell nearby.'],
  ['Help Rook mend the instrument,\nthen meet Nell by the lantern.\nYour crew is waiting there.','Mend the instrument with Sable,\nthen meet Nell by the lantern.\nThe festival is waiting for its music.'],
  ['Bring the reed to Rook at the festival','Take the reed to the festival orchestra'],
  ['FIRST: Help Rook at the\npatched instrument nearby.','FIRST: Repair the patched\ninstrument with Sable.']
 ],
 3:[
  ["FATHER: Brass drives the dawn train. I heard him arguing with the guards.\nSABLE: Where can we find him?\nFATHER: The glass viaduct. There's a refuge underneath the west end. Please—my daughter's safe now. Their children are still waiting.","FATHER: You were arguing with the guards on the dawn train.\nBRASS: I know the carriages. Are they still on the glass viaduct?\nFATHER: Yes. The refuge underneath the west end is open. Please—my daughter's safe now. Their children are still waiting."],
  ['Brass waits beyond the yard.','The other prisoners wait beyond the yard.'],
  ['The docket leads to the glass viaduct. A line of locked carriages waits above the refuge where Brass has been sheltering people.\nHe knows how to open the train. The warden is about to order him to leave.','Brass follows the docket back to the glass viaduct. Locked carriages wait above the refuge he kept open.\nHe knows how to open the train. This time he brings help, and the warden can see him returning.'],
  ['Find Brass, open the prison carriages, and get their passengers to the refuge.','Return with Brass, open the prison carriages, and get their passengers to the refuge.'],
  ['Brass stands beside the far carriage, watched by the warden.','Brass leads the crew toward the far carriage. The warden recognizes him.'],
  ["BRASS: Nell sent you? I left the refuge open in case somebody got out. That's all I dared.","BRASS: The refuge is still open. I left it that way in case somebody got out. It was all I dared before we came here."],
  ["BRASS: The warden still has the far carriage. I'll keep these doors open. When you reach him, I won't pretend I can't see.","BRASS: The warden still has the far carriage. I'll keep these doors open. When we reach him, I won't pretend I can't see."],
  ['The carriage lock has three numbered dials. Brass is standing beside the far carriage.','The carriage lock has three numbered dials. Check the far carriage with Brass before turning them.']
 ],
 4:[
  ["BRASS: I took those papers to the well myself. Told myself it wasn't my business.\nIONA: Riven's still down there.\nBRASS: Then ask him. The drain stairs are below this bridge. I'll carry the papers this time—and stay to hear the answer.","BRASS: I took those papers to the well myself. Told myself it wasn't my business.\nIONA: Riven, that is your signature.\nRIVEN: I know. Bring it to the well. First we stop the water reaching anyone else.\nBRASS: The drain stairs are below this bridge. I'll carry the papers this time—and stay to hear your answer."],
  ['Find him at the undercity well. Before asking for an explanation, stop anyone else from drinking it.','Return with Riven to the undercity well. Before hearing his explanation, stop anyone else from drinking it.'],
  ['Find Riven and clear the poisoned filter before more water reaches the lower city.','Return with Riven and clear the poisoned filter before more water reaches the lower city.'],
  ['RIVEN: Hesper. The chapel is up the stairs above this drain. Take me with you. She deserves to hear me say it.','RIVEN: Hesper. The chapel is up the stairs above this drain. I will tell her myself. She deserves to hear me say it.']
 ],
 5:[
  ["HESPER: Riven kept one lie alive. The archive has thousands. Mira kept the names they tried to strike out.\nRIVEN: Will she believe us?\nHESPER: Take her my account. The archive is east of here. And tell her I'm tired of being called a missing person.","HESPER: Riven kept one lie alive. The archive has thousands. Mira, you kept the names they tried to strike out.\nMIRA: I kept what I could reach. The index has the rest.\nHESPER: Then take my account into the archive. It is east of here. I'm tired of being called a missing person."],
  ["Bring Hesper's account to Mira.\nGo east to the archive, or visit Festival Commons first.","Carry Hesper's account into the archive with Mira.\nGo east to the archive, or visit Festival Commons first."],
  ['Reach her in the west wing, then use her key at the eastern index. We need the records intact.','Go with Mira to the west-wing access point, then use her key at the eastern index. We need the records intact.'],
  ["Mira is waiting among the archive's west-wing shelves.",'Mira leads the crew among the archive’s west-wing shelves.'],
  ['MIRA: Hesper sent you? Then help me keep the evidence in one piece.','MIRA: Hesper’s account belongs with these records. Help me keep the evidence in one piece.'],
  ['The eastern index is locked. Mira has the access key in the west wing.','The eastern index is locked. Check the west-wing access point with Mira before using her key.']
 ],
 6:[
  ["MIRA: Veyr's authorization is on every transfer. He's in the sky engine's mooring office.",'MIRA: Veyr, your authorization is on every transfer. The controls are in your sky-engine mooring office.'],
  ['Confront Veyr with the copied registrations.\nGo to the sky engine, or return to Festival Commons first.','Take the copied registrations back to the sky engine with Veyr.\nGo to the sky engine, or return to Festival Commons first.'],
  ["The archive records lead to Veyr's mooring office above the city. He has stopped obeying Orison, but the engine he built is still drawing voices into the spire.",'Veyr takes the crew back to his mooring office above the city. He has stopped obeying Orison, but the engine he built is still drawing voices into the spire.'],
  ["BRASS: That's Veyr's light. He's still here.",'BRASS: Your office is still lit.\nVEYR: Then we may still be able to reach the controls.'],
  ['VEYR: Before you say it—yes, my name is on the transfers. The engine is mine. Let me get the dock out of the city\'s way.','VEYR: You have seen my name on the transfers. The engine is mine. Now let me get the dock out of the city\'s way.'],
  ["The mooring controls need Veyr's authorization. He is beside the chart table.",'The mooring controls need Veyr’s authorization. Use it at the chart table.'],
  ['Make the sky dock safe and make Veyr help stop the system he designed.','Return with Veyr to make the sky dock safe and stop the system he designed.']
 ]
};

/** Single string in/out, suitable for World text/choice pages and intro notices.
 * Never changes historical origins, other travellers, clues or saved text. */
export function selectedLeadText(state,text){
 if(typeof text!=='string'||state?.chronicle?.phase==='past')return text;
 const lead=selectedJourneyLead(state);
 if(lead===0||!(state?.recruited?.includes(lead)||state?.party?.includes(lead)||state?.chronicle?.phase==='present'))return text;
 for(const [before,after] of SELECTED_LEAD_TEXT[lead]||[])if(text.includes(before))text=text.split(before).join(after);
 return text;
}
