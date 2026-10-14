import {createPet,restorePet,advance,mood,action,affect,equip,encounter,remember,rarity,randomLook,TRAITS,MOODS,STORAGE_KEY,clamp} from './pet.js';
import {PALETTE_NAMES,SHAPE_LABELS} from './palettes.js';
import {Eyes} from './eyes.js';
import {Sensors} from './sensors.js';
import {Meetings} from './meet.js';
import {FirstBoot} from './first-boot.js';
import {BootSequence} from './boot-sequence.js';
import {EnvironmentSensors} from './environment-sensors.js';
import {Visits} from './visits.js';
import {GESTURES} from './gesture.js';

const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
let pet;try{pet=restorePet(localStorage.getItem(STORAGE_KEY));}catch{}
const firstLife=!pet||pet.hatched!==true;pet ||=createPet();if(firstLife&&matchMedia('(prefers-reduced-motion: reduce)').matches)pet.settings.reducedMotion=true;
let bootStorage;try{bootStorage=localStorage;}catch{}
const firstBoot=new FirstBoot(bootStorage);
let bootPending=!firstBoot.completed;
const bootSequence=new BootSequence($('#first-boot-screen'),{blocked:rotationBlocked});
if(bootPending){document.body.classList.add('booting');$('#universe').inert=true;$('#first-boot-screen').hidden=false;}
let storageWarning=false,toastTimer,batteryTimer,activePanel='',catalogShape=pet.shape,peers=[],seenPeers=new Set(),lastPet=0,playCount=0,playTimer,installPrompt,wakeLock,audio,welcomePending=firstLife,initialized=false,lastSharedMood='',sharedAt=0,stroke=null,ignoreClickUntil=0;
const panel=$('#control-panel'),eyes=new Eyes($('#eyes'),pet);
eyes.suspended=bootPending;
eyes.idleAllowed=()=>initialized&&!bootPending&&!welcomePending&&!panel.open&&$('#play-star').hidden;
const hints={happy:'Está contento de estar contigo.',curious:'Todo es nuevo cuando miras con curiosidad.',sleepy:'Un pequeño descanso le vendría bien.',asleep:'Ahora mismo está soñando contigo.',hungry:'¿Y si le das un bocado de estrellas?',anxious:'Demasiado ruido para un chico tan pequeño.',cold:'Un poquito de calor, por favor.',hot:'Hasta las estrellas necesitan refrescarse.',dizzy:'El universo está dando vueltas.',angry:'Necesita un momento para calmarse.',sad:'Un poco de cariño le haría bien.',playful:'Atrapa esa estrella.',loved:'Contigo se siente en casa.'};
const gestureMoods={nod:'happy',nope:'curious',surprise:'curious','look-left':'curious','look-right':'curious','look-up':'curious','look-down':'curious'};
const gestureActions={thumbs:'Ver energía',middle:'Tristeza',pet:'Acariciar',play:'Jugar',love:'Cariño',calm:'Calmar',curious:'Curiosidad',hello:'Saludar',feed:'Dar de comer',celebrate:'Celebrar',kiss:'Beso',blink:'Parpadear',surprise:'Sorpresa',nod:'Asentir',nope:'Negar','look-left':'Mirar a la izquierda','look-right':'Mirar a la derecha','look-up':'Mirar arriba','look-down':'Mirar abajo'};
for(const [type,label] of Object.entries(gestureActions)){
  const item=document.createElement('div'),title=document.createElement('dt'),names=document.createElement('dd');title.textContent=label;names.textContent=Object.values(GESTURES).filter(gesture=>gesture.action===type).map(gesture=>gesture.label).join(' · ');item.append(title,names);$('#gesture-list').append(item);
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(pet));}catch{if(!storageWarning){storageWarning=true;toast('No se puede guardar en este navegador. Exporta tu mascota para conservarla.');}}}
function tone(kind='pet'){
  if(!pet.settings.sound)return;
  try{const Context=window.AudioContext||window.webkitAudioContext;audio ||=new Context();audio.resume();const now=audio.currentTime;for(const [index,freq] of (kind==='play'?[523.25,659.25,783.99]:kind==='feed'?[392,523.25]:[659.25,880]).entries()){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=freq;gain.gain.setValueAtTime(0,now+index*.09);gain.gain.linearRampToValueAtTime(.035,now+index*.09+.015);gain.gain.exponentialRampToValueAtTime(.001,now+index*.09+.17);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now+index*.09);oscillator.stop(now+index*.09+.2);}}
  catch{}
}
function haptic(){if(navigator.vibrate)navigator.vibrate(12);}
function update(){
  advance(pet);const state=mood(pet);eyes.mood=state;
  $('#pet-name').textContent=pet.name;$('#personality').textContent=`${TRAITS[pet.trait].toUpperCase()} · TU PEQUEÑO UNIVERSO`;
  $('#mood-label').textContent=MOODS[state];$('#mood-hint').textContent=hints[state];$('#universe').dataset.mood=state;
  for(const stat of ['energy','hunger','happiness','bond']){$(`#${stat}-value`).textContent=`${Math.round(pet[stat])}%`;$(`#${stat}-meter`).value=pet[stat];}
  $('#sleep-label').textContent=pet.asleep?'Despertar':'Dormir';$('#collection-count').textContent=`${pet.collection.length} / 400`;
  $('#current-look').textContent=`${SHAPE_LABELS[pet.shape]} · ${PALETTE_NAMES[pet.palette]} · ${rarity(pet.palette)}`;
  const days=Math.floor((Date.now()-pet.born)/86400000);$('#pet-age').textContent=days?`${days} ${days===1?'día':'días'} contigo`:'Su primer día';
  $('#trait-name').textContent=`${TRAITS[pet.trait]} · ${(pet.behaviors||[pet.trait]).length} comportamientos`;$('#sound-setting').checked=pet.settings.sound;$('#sound-toggle').classList.toggle('sound-on',pet.settings.sound);$('#sound-toggle').setAttribute('aria-pressed',String(pet.settings.sound));$('#sound-toggle').setAttribute('aria-label',pet.settings.sound?'Desactivar sonidos':'Activar sonidos');$('#reduced-motion').checked=pet.settings.reducedMotion;
  $('#temperature-value').textContent=`${pet.environment.temperature} °C`;$('#noise-value').textContent=`${Math.round(pet.environment.noise)} %`;
  if(document.activeElement!==$('#rename'))$('#rename').value=pet.name;
  if(meetings.visits.length&&state!==lastSharedMood&&Date.now()-sharedAt>1200){lastSharedMood=state;sharedAt=Date.now();meetings.refresh();}
}
function perform(type,{sensor=false,remote=false}={}){
  if(type==='pet'&&Date.now()-lastPet<700)return;if(type==='pet')lastPet=Date.now();
  if(type==='blink'){eyes.react('blink');return;}
  const careType=['love','kiss','hello'].includes(type)?'pet':type==='celebrate'?'play':type;
  action(pet,careType);if(type==='curious')affect(pet,'curious',7000);if(type==='love'||type==='kiss')affect(pet,'loved',7000);
  if(gestureMoods[type])affect(pet,gestureMoods[type],2500);
  eyes.react(type==='hello'?'wave':type==='sleep'?(pet.asleep?'sleep':'wake'):type);if(['play','feed','pet','love','kiss','hello','celebrate'].includes(type))tone(careType);haptic();
  if(!remote&&['pet','feed','play','calm','thumbs'].includes(careType))meetings.sendVisitAction(careType);
  if(type==='play'){if(sensor){toast('¡A jugar juntos!');}else{closePanel();startGame();}}else if(type==='sleep')toast(pet.asleep?'Buenas noches, pequeño.':'Hola de nuevo, pequeño.');else if(type==='feed')toast('Un bocado de estrellas. Saciedad +25.');else if(type==='thumbs')showBattery();else if(type==='shake')toast('¡Demasiadas vueltas! Dale un momento.');else if(type==='middle')toast('Un poco triste. Una caricia puede ayudar.');update();save();if(meetings.visits.length)meetings.refresh();
}
async function showBattery(){
  let value=`${Math.round(pet.energy)}%`,detail='Energía de tu mascota · Safari no expone la batería del iPhone.';
  if(typeof navigator.getBattery==='function'){try{const battery=await navigator.getBattery();value=`${Math.round(battery.level*100)}%`;detail=`Batería de este dispositivo${battery.charging?' · Cargando':''}`;}catch{}}
  $('#battery-value').textContent=value;$('#battery-detail').textContent=detail;$('#battery-card').hidden=false;clearTimeout(batteryTimer);batteryTimer=setTimeout(()=>$('#battery-card').hidden=true,5000);
}
function moveStar(){const button=$('#play-star'),x=Math.max(60,innerWidth*(.18+Math.random()*.64)),y=innerHeight*(.24+Math.random()*.4);button.style.left=`${x-30}px`;button.style.top=`${y-30}px`;eyes.look((x/innerWidth-.5)*1.1,(y/innerHeight-.5)*.8);}
function startGame(){playCount=0;$('#play-star').hidden=false;moveStar();clearTimeout(playTimer);playTimer=setTimeout(finishGame,25000);toast('Atrapa 5 estrellas. ¡Toca la estrella que aparece!');}
function finishGame(){clearTimeout(playTimer);$('#play-star').hidden=true;eyes.look(0,0);if(playCount>=5){pet.happiness=clamp(pet.happiness+10);affect(pet,'loved',7000);eyes.react('celebrate');remember(pet,'Atrapamos cinco estrellas juntos.');toast('Cinco estrellas. Un chico muy feliz.');}else{eyes.react('calm');toast('Las estrellas te esperan para otra partida.');}update();save();}
$('#play-star').addEventListener('click',()=>{playCount++;eyes.react('play');tone('play');haptic();if(playCount>=5)finishGame();else{moveStar();toast(`${playCount} / 5 estrellas`);}});

const sensors=new Sensors({
  noise:value=>{pet.environment.noise=Math.round(value);$('#noise').value=value;update();},
  motion:()=>perform('shake'),gesture:(type,name)=>{perform(type,{sensor:true});if(GESTURES[name]){$('#camera-gesture').textContent=`${GESTURES[name].label} → ${gestureActions[type]}`;$('#camera-gesture').hidden=false;}},gaze:(x,y)=>eyes.look(x,y),
  light:value=>{if(realSensors.state.light!=='on')reactToLight(value);},
  status:(name,state,message)=>{const button=$(`#${name}-toggle`);button.textContent=state==='loading'?'Cancelar':state==='on'?'Apagar':state==='paused'?'Reanudar':'Activar';button.setAttribute('aria-pressed',String(state==='on'));button.dataset.state=state;button.disabled=false;$(`#${name}-note`).textContent=message;if(state==='error')toast(message);if(name==='microphone')$('#noise').disabled=state==='on';if(name==='camera'&&state!=='on')$('#camera-gesture').hidden=true;}
});
function reactToLight(value){if(value<.09&&!pet.asleep&&Date.now()-(pet.lastDark||0)>90000){pet.lastDark=Date.now();affect(pet,'sleepy',5000);update();}}
const realSensors=new EnvironmentSensors({
  temperature:value=>{pet.environment.temperature=Math.round(value*100)/100;$('#temperature').value=value;pet.effect=null;update();save();},
  light:(value,lux)=>{$('#light-reading').textContent=`${Math.round(lux)} lux`;reactToLight(value);},
  status:(name,state,message)=>{const button=$(`#${name}-sensor-toggle`);button.textContent=state==='loading'?'Cancelar':state==='on'?'Desconectar':state==='paused'?'Reanudar':'Conectar';button.setAttribute('aria-pressed',String(state==='on'));$(`#${name}-sensor-note`).textContent=message;if(name==='temperature'){$('#temperature').disabled=state==='on';$('#temperature-source').textContent=state==='on'?'Medida por tu termómetro Bluetooth.':'Temperatura manual.';}if(name==='light'&&state!=='on')$('#light-reading').textContent='';if(state==='error')toast(message);}
});
for(const name of ['temperature','light']){const button=$(`#${name}-sensor-toggle`);button.disabled=!realSensors.available(name);if(button.disabled)button.textContent='No disponible';$(`#${name}-sensor-note`).textContent=realSensors.note(name);button.addEventListener('click',()=>realSensors.toggle(name));}

const profile=()=>({id:pet.id,name:pet.name,palette:pet.palette,shape:pet.shape,trait:pet.trait,mood:mood(pet)});
const meetings=new Meetings({profile,
  status:(state,message)=>{
    if(state==='visit-error'){toast(message);return;}
    $('#meet-status').textContent=state==='connected'?`Sala ${message}`:state==='connecting'?'Conectando…':'Sin conectar';
    $('#online-status span').textContent=state==='connected'?`SALA ${message}`:'EN TU MUNDO';$('#room-form button').disabled=state==='connecting';$('#meet-actions').hidden=state!=='connected';
    if(state==='error'||state==='visit-error'||(state==='disconnected'&&message))toast(message);if(state==='connected')toast(`Sala ${message}. Comparte el código con otro iPhone.`);
  },
  peers:list=>{peers=list;const container=$('#peer-list');container.replaceChildren();for(const other of list){
    if(!seenPeers.has(other.id)&&encounter(pet,other)){seenPeers.add(other.id);eyes.spark();tone('play');toast(`${other.name} acaba de entrar en tu pequeño universo.`);update();save();}
    const row=document.createElement('div');row.className='peer';const canvas=document.createElement('canvas');row.append(canvas);eyes.thumbnail(canvas,other.palette,other.shape);const info=document.createElement('div');const name=document.createElement('strong');name.textContent=other.name;const description=document.createElement('small');description.textContent=`${TRAITS[other.trait]} · ${PALETTE_NAMES[other.palette]}`;info.append(name,description);row.append(info);const enter=document.createElement('button');enter.className='visit-button';enter.textContent='Entrar en su universo ↗';enter.addEventListener('click',()=>{if(meetings.visit(other.id))closePanel();});row.append(enter);container.append(row);
  }},
  action:message=>{const other=message.from;if(message.action==='wave'){affect(pet,'loved',7000);eyes.react('wave');toast(`${other.name} te saluda.`);}if(message.action==='play'){action(pet,'play');tone('play');eyes.react('play');toast(`${other.name} quiere jugar contigo.`);}if(message.action==='swap'){equip(pet,other.palette,other.shape);eyes.setLook(pet.palette,pet.shape);remember(pet,`Intercambié mis ojos con ${other.name}.`);toast(`Ahora tienes los ojos de ${other.name}.`);meetings.refresh();}update();save();},
  visits:list=>visits.update(list),
  visitAction:message=>{visits.react(message);if(message.from.id!==pet.id)perform(message.action==='wave'?'hello':message.action,{sensor:true,remote:true});}
});
const visits=new Visits({container:$('#visitor-space'),myId:()=>pet.id,settings:()=>pet.settings,onLeave:()=>meetings.leaveVisit(),onAction:type=>{if(type==='wave'){eyes.react('wave');meetings.sendVisitAction('wave');}else perform(type,{sensor:true});},role:info=>{document.body.classList.toggle('visiting',Boolean(info));document.body.classList.toggle('visiting-guest',info?.role==='guest');$('#visit-status').hidden=!info;if(info){$('#visit-status').textContent=info.role==='guest'?`Dentro del universo de ${info.host.name}`:`${info.guest.name} está en tu universo`;eyes.look(info.role==='guest'?-.22:.22,0);eyes.react('wave');toast($('#visit-status').textContent);}else{eyes.look(0,0);eyes.react('return');}}});

function openPanel(name){
  activePanel=name;const titles={eyes:'Ojos',care:'Cuidados',environment:'Ambiente',meet:'Encuentros',diary:'Diario',settings:'Ajustes'};$('#panel-title').textContent=titles[name];
  $$('[data-section]').forEach(s=>s.hidden=s.dataset.section!==name);$$('.panel-nav [data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
  if(!panel.open)panel.showModal();$('.panel-content').scrollTop=0;update();if(name==='eyes'){catalogShape=pet.shape;renderCatalog();}if(name==='diary')renderDiary();
}
function closePanel(){panel.close();activePanel='';}
$$('[data-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel)));$('#identity-button').addEventListener('click',()=>openPanel('care'));$('#close-panel').addEventListener('click',closePanel);
panel.addEventListener('click',event=>{if(event.target===panel){const rect=panel.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePanel();}});
panel.addEventListener('close',()=>{activePanel='';});$$('[data-action]').forEach(b=>b.addEventListener('click',()=>perform(b.dataset.action)));
$$('[data-sensor]').forEach(b=>b.addEventListener('click',()=>sensors.toggle(b.dataset.sensor)));
$('#temperature').value=pet.environment.temperature;$('#temperature').addEventListener('input',event=>{pet.environment.temperature=Number(event.target.value);pet.effect=null;update();save();});$('#noise').value=pet.environment.noise;$('#noise').addEventListener('input',event=>{pet.environment.noise=Number(event.target.value);pet.effect=null;update();save();});

let catalogObserver;
function renderCatalog(){
  catalogObserver?.disconnect();const container=$('#eye-catalog');container.replaceChildren();$$('[data-shape]').forEach(b=>b.classList.toggle('active',Number(b.dataset.shape)===catalogShape));
  const search=$('#eye-search').value.trim().toLowerCase(),only=$('#collection-only').checked;
  const canvases=[];
  for(let palette=0;palette<PALETTE_NAMES.length;palette++){
    const name=PALETTE_NAMES[palette],discovered=pet.collection.includes(`${catalogShape}-${palette}`);if(!name.includes(search)||(only&&!discovered))continue;
    const button=document.createElement('button');button.className='eye-card';button.classList.toggle('selected',pet.palette===palette&&pet.shape===catalogShape);button.setAttribute('aria-label',`${SHAPE_LABELS[catalogShape]} ${name}, ${rarity(palette)}`);button.dataset.palette=palette;button.dataset.shape=catalogShape;const canvas=document.createElement('canvas');canvas.width=180;canvas.height=90;canvas.dataset.palette=palette;canvas.dataset.shape=catalogShape;const title=document.createElement('strong');title.textContent=name;const label=document.createElement('small');label.textContent=rarity(palette);label.className={'Legendario':'rarity-legendary','Épico':'rarity-epic','Raro':'rarity-rare'}[rarity(palette)]||'';
    button.append(canvas,title,label);if(discovered){const check=document.createElement('span');check.className='discovered';check.textContent='✦';button.append(check);}
    button.addEventListener('click',()=>{equip(pet,palette,Number(button.dataset.shape));eyes.setLook(pet.palette,pet.shape);eyes.react('discover');affect(pet,'happy',3000);remember(pet,`Hoy miro el mundo con ojos ${name}.`);update();save();meetings.refresh();renderCatalog();haptic();});container.append(button);canvases.push(canvas);
  }
  if(!canvases.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Todavía no hay ojos aquí. Prueba otra forma o descubre un color nuevo.';container.append(empty);return;}
  catalogObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){const c=entry.target;eyes.thumbnail(c,Number(c.dataset.palette),Number(c.dataset.shape));catalogObserver.unobserve(c);}}},{root:$('.panel-content'),rootMargin:'100px'});canvases.forEach(c=>catalogObserver.observe(c));
}
$$('[data-shape]').forEach(b=>b.addEventListener('click',()=>{catalogShape=Number(b.dataset.shape);renderCatalog();}));$('#eye-search').addEventListener('input',renderCatalog);$('#collection-only').addEventListener('change',renderCatalog);
$('#random-eyes').addEventListener('click',()=>{const look=randomLook();equip(pet,look.palette,look.shape);eyes.setLook(pet.palette,pet.shape);catalogShape=pet.shape;remember(pet,`Descubrí mis ojos ${PALETTE_NAMES[pet.palette]}.`);affect(pet,'happy',5000);eyes.react('discover');update();save();meetings.refresh();renderCatalog();toast(`${PALETTE_NAMES[pet.palette]} · ${rarity(pet.palette)}`);});
function renderDiary(){const container=$('#memory-list');container.replaceChildren();if(!pet.memory.length){container.textContent='La historia empieza contigo.';return;}for(const memory of pet.memory){const item=document.createElement('div');item.className='memory-item';const star=document.createElement('span');star.textContent='✦';const body=document.createElement('div');const text=document.createElement('p');text.textContent=memory.text;const date=document.createElement('small');date.textContent=new Date(memory.at).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});body.append(text,date);item.append(star,body);container.append(item);}}

$('#room-form').addEventListener('submit',event=>{event.preventDefault();if(!navigator.onLine){toast('Los encuentros necesitan conexión a internet.');return;}seenPeers=new Set();meetings.join($('#room-code').value);});$('#new-room').addEventListener('click',()=>{$('#room-code').value=Math.random().toString(36).slice(2,8).toUpperCase();$('#room-code').focus();});$('#leave-room').addEventListener('click',()=>{meetings.leave();seenPeers.clear();});
$$('[data-meet]').forEach(b=>b.addEventListener('click',()=>{
  if(!peers.length){toast('Espera a que entre otro Starboy en la sala.');return;}
  const type=b.dataset.meet,target=type==='swap'?peers[0].id:undefined;if(!meetings.send(type,target)){toast('La sala está desconectada. Vuelve a entrar.');return;}
  if(type==='swap'){const other=peers[0];equip(pet,other.palette,other.shape);eyes.setLook(pet.palette,pet.shape);remember(pet,`Intercambié mis ojos con ${other.name}.`);meetings.refresh();toast(`Ojos intercambiados con ${other.name}.`);}else if(type==='play'){action(pet,'play');eyes.spark();tone('play');toast('Una estrella para compartir.');}else{affect(pet,'loved',5000);eyes.spark('heart');toast('Un saludo desde tu pequeño universo.');}update();save();
}));

function toggleSound(value){pet.settings.sound=value;update();save();if(value)tone();}
$('#sound-toggle').addEventListener('click',()=>toggleSound(!pet.settings.sound));$('#sound-setting').addEventListener('change',event=>toggleSound(event.target.checked));$('#reduced-motion').addEventListener('change',event=>{pet.settings.reducedMotion=event.target.checked;eyes.resetMotion(performance.now());if(visits.pet){visits.pet.settings.reducedMotion=event.target.checked;visits.eyes?.resetMotion(performance.now());}update();save();});$('#rename').addEventListener('change',event=>{pet.name=event.target.value.trim().slice(0,24)||'Starboy';update();save();meetings.refresh();});
$('#export-pet').addEventListener('click',()=>{save();const url=URL.createObjectURL(new Blob([JSON.stringify(pet,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='mi-starboy.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Guarda el archivo para llevar tu mascota a otro dispositivo.');});
$('#import-pet').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>500000)throw new Error();const imported=restorePet(await file.text());if(!imported)throw new Error();if(!confirm('¿Sustituir tu mascota actual por la del archivo?'))return;sensors.stopAll();realSensors.stopAll();meetings.leave();seenPeers.clear();clearTimeout(playTimer);$('#play-star').hidden=true;pet=imported;eyes.pet=pet;eyes.resetMotion(performance.now());eyes.setLook(pet.palette,pet.shape);$('#temperature').value=pet.environment.temperature;$('#noise').value=pet.environment.noise;update();save();welcomePending=pet.hatched!==true;$('#first-name').value=pet.name;closePanel();syncWelcome();toast('Tu pequeño compañero vuelve a casa.');}catch{toast('Este archivo no contiene una mascota válida.');}finally{event.target.value='';}});
$('#reset-pet').addEventListener('click',()=>{if(!confirm('¿Comenzar una nueva vida? Exporta antes tu mascota si quieres conservarla.'))return;sensors.stopAll();realSensors.stopAll();meetings.leave();seenPeers.clear();clearTimeout(playTimer);$('#play-star').hidden=true;pet=createPet();eyes.pet=pet;eyes.resetMotion(performance.now());eyes.setLook(pet.palette,pet.shape);remember(pet,'Abrí los ojos por primera vez.');$('#temperature').value=22;$('#noise').value=0;update();save();closePanel();$('#first-name').value='Starboy';welcomePending=true;syncWelcome();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});$('#install-button').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else toast('En Safari: Compartir → Añadir a pantalla de inicio. Desactiva el bloqueo de orientación del iPhone.');});
$('#boot-close').addEventListener('click',()=>bootSequence.finish?.());
$('#replay-boot').addEventListener('click',async()=>{
  if(bootPending)return;sensors.pause();realSensors.pause();closePanel();bootPending=true;eyes.suspended=true;
  bootSequence.elapsed=0;document.body.classList.add('booting');$('#universe').inert=true;$('#first-boot-screen').hidden=false;$('#boot-close').hidden=false;
  try{await bootSequence.play();}catch(error){toast(error.message);}
  finally{bootSequence.elapsed=0;$('#boot-close').hidden=true;$('#first-boot-screen').hidden=true;bootPending=false;eyes.suspended=false;document.body.classList.remove('booting');$('#universe').inert=false;syncWelcome();}
});
async function keepAwake(){if(!navigator.wakeLock)return;try{wakeLock=await navigator.wakeLock.request('screen');}catch{}}
$('#immersive-button').addEventListener('click',async()=>{$('#universe').classList.add('immersive');keepAwake();try{await document.documentElement.requestFullscreen?.();}catch{}try{await screen.orientation.lock('landscape');}catch{}});
function rotationBlocked(){return matchMedia('(orientation: portrait) and (max-width: 700px)').matches&&!document.body.classList.contains('portrait-allowed');}
function syncWelcome(){if(!initialized||bootPending||!welcomePending||document.hidden)return;if(rotationBlocked()){if($('#welcome').open)$('#welcome').close();}else if(!$('#welcome').open)$('#welcome').showModal();}
$('#eyes').addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0||!pet.hatched||bootPending||panel.open)return;stroke={id:event.pointerId,x:event.clientX,y:event.clientY,petAt:-Infinity,performed:false};});
$('#eyes').addEventListener('pointermove',event=>{
  eyes.look((event.clientX/innerWidth-.5)*1.2,(event.clientY/innerHeight-.5)*.8);
  if(stroke?.id===event.pointerId&&Math.hypot(event.clientX-stroke.x,event.clientY-stroke.y)>24&&performance.now()-stroke.petAt>950){stroke.x=event.clientX;stroke.y=event.clientY;stroke.petAt=performance.now();stroke.performed=true;perform('pet');}
});
function finishStroke(event){if(stroke?.id!==event.pointerId)return;if(stroke.performed)ignoreClickUntil=performance.now()+400;stroke=null;}
$('#eyes').addEventListener('pointerup',finishStroke);$('#eyes').addEventListener('pointercancel',finishStroke);$('#eyes').addEventListener('pointerleave',event=>{finishStroke(event);eyes.look(0,0);});
$('#eyes').addEventListener('click',()=>{if($('#universe').classList.contains('immersive')){$('#universe').classList.remove('immersive');return;}if(performance.now()<ignoreClickUntil)return;perform('pet');});$('#portrait-continue').addEventListener('click',()=>{document.body.classList.add('portrait-allowed');syncWelcome();});
window.addEventListener('resize',()=>{if(rotationBlocked()&&panel.open)closePanel();syncWelcome();});
$('#hatch').addEventListener('click',()=>{welcomePending=false;pet.hatched=true;pet.name=$('#first-name').value.trim().slice(0,24)||'Starboy';remember(pet,'Abrí los ojos y te conocí.');$('#welcome').close();affect(pet,'loved',8000);eyes.react('welcome');tone();keepAwake();update();save();toast(`Hola, ${pet.name}. Bienvenido a tu pequeño universo.`);});
$('#welcome').addEventListener('cancel',event=>event.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden){stroke=null;save();wakeLock?.release().catch(()=>{});}else{advance(pet);update();if(wakeLock)keepAwake();if(initialized&&!firstBoot.completed)startFirstBoot();else syncWelcome();}});
window.addEventListener('pagehide',()=>{sensors.pause();realSensors.pause();meetings.leave();save();});window.addEventListener('online',()=>toast('De vuelta en el universo.'));window.addEventListener('offline',()=>toast('Sin conexión. Tu mascota y sus ojos siguen contigo.'));
let lastSaved=Date.now();setInterval(()=>{update();if(Date.now()-lastSaved>10000){save();lastSaved=Date.now();}},1000);
update();const engine=await eyes.init();$('#engine-note').textContent=`Port web experimental inspirado en Starboy de CREATURE. Ojos: ${engine==='original'?'motor original':'motor de reserva'}. Los cuidados y encuentros son funciones de esta adaptación.`;
initialized=true;
window.starboy={get pet(){return pet;},get engine(){return eyes.engine;},sensors,realSensors,meetings,visits,eyes,firstBoot,bootSequence};
async function startFirstBoot(){
  if(firstBoot.completed||firstBoot.running||document.hidden)return;
  bootPending=true;eyes.suspended=true;document.body.classList.add('booting');$('#universe').inert=true;$('#first-boot-screen').hidden=false;
  if($('#welcome').open)$('#welcome').close();
  try{await firstBoot.play(()=>bootSequence.play());}
  catch(error){console.warn(error.message);toast('No se pudo cargar el primer encendido. Lo intentaremos al volver.');}
  finally{bootPending=false;eyes.suspended=false;document.body.classList.remove('booting');$('#universe').inert=false;$('#first-boot-screen').hidden=true;syncWelcome();}
}
window.addEventListener('pageshow',event=>{if(event.persisted&&!firstBoot.completed)startFirstBoot();});
if(bootPending)await startFirstBoot();
if(welcomePending)syncWelcome();else{save();keepAwake();}
