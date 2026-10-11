import {createPet,restorePet,advance,mood,action,affect,equip,encounter,remember,rarity,randomLook,TRAITS,MOODS,STORAGE_KEY,clamp} from './pet.js';
import {PALETTE_NAMES,SHAPE_LABELS} from './palettes.js';
import {Eyes} from './eyes.js';
import {Sensors} from './sensors.js';
import {Meetings} from './meet.js';

const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
let pet;try{pet=restorePet(localStorage.getItem(STORAGE_KEY));}catch{}
const firstLife=!pet;pet ||=createPet();if(firstLife&&matchMedia('(prefers-reduced-motion: reduce)').matches)pet.settings.reducedMotion=true;
let storageWarning=false,toastTimer,batteryTimer,activePanel='',catalogShape=pet.shape,peers=[],seenPeers=new Set(),lastPet=0,playCount=0,playTimer,installPrompt,wakeLock,audio,welcomePending=firstLife,initialized=false,nextBehavior=Date.now()+45000;
const panel=$('#control-panel'),eyes=new Eyes($('#eyes'),pet);
const hints={happy:'Está contento de estar contigo.',curious:'Todo es nuevo cuando miras con curiosidad.',sleepy:'Un pequeño descanso le vendría bien.',asleep:'Ahora mismo está soñando contigo.',hungry:'¿Y si le das un bocado de estrellas?',anxious:'Demasiado ruido para un chico tan pequeño.',cold:'Un poquito de calor, por favor.',hot:'Hasta las estrellas necesitan refrescarse.',dizzy:'El universo está dando vueltas.',angry:'Necesita un momento para calmarse.',sad:'Un poco de cariño le haría bien.',playful:'Atrapa esa estrella.',loved:'Contigo se siente en casa.'};
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
}
function perform(type){
  if(type==='pet'&&Date.now()-lastPet<700)return;if(type==='pet')lastPet=Date.now();
  action(pet,type);if(['pet','feed','calm'].includes(type))eyes.spark(type==='pet'?'heart':'star');if(['play','feed','pet'].includes(type))tone(type);haptic();
  if(type==='play'){closePanel();startGame();}else if(type==='sleep')toast(pet.asleep?'Buenas noches, pequeño.':'Hola de nuevo, pequeño.');else if(type==='feed')toast('Un bocado de estrellas. Saciedad +25.');else if(type==='thumbs')showBattery();else if(type==='shake')toast('¡Demasiadas vueltas! Dale un momento.');else if(type==='middle')toast('Un poco triste. Una caricia puede ayudar.');update();save();
}
async function showBattery(){
  let value=`${Math.round(pet.energy)}%`,detail='Energía de tu mascota · Safari no expone la batería del iPhone.';
  if(typeof navigator.getBattery==='function'){try{const battery=await navigator.getBattery();value=`${Math.round(battery.level*100)}%`;detail=`Batería de este dispositivo${battery.charging?' · Cargando':''}`;}catch{}}
  $('#battery-value').textContent=value;$('#battery-detail').textContent=detail;$('#battery-card').hidden=false;clearTimeout(batteryTimer);batteryTimer=setTimeout(()=>$('#battery-card').hidden=true,5000);
}
function moveStar(){const button=$('#play-star');button.style.left=`${Math.max(60,innerWidth*(.18+Math.random()*.64))-30}px`;button.style.top=`${innerHeight*(.24+Math.random()*.4)-30}px`;}
function startGame(){playCount=0;$('#play-star').hidden=false;moveStar();clearTimeout(playTimer);playTimer=setTimeout(finishGame,25000);toast('Atrapa 5 estrellas. ¡Toca la estrella que aparece!');}
function finishGame(){clearTimeout(playTimer);$('#play-star').hidden=true;if(playCount>=5){pet.happiness=clamp(pet.happiness+10);affect(pet,'loved',7000);remember(pet,'Atrapamos cinco estrellas juntos.');toast('Cinco estrellas. Un chico muy feliz.');}else toast('Las estrellas te esperan para otra partida.');update();save();}
$('#play-star').addEventListener('click',()=>{playCount++;eyes.spark();tone('play');haptic();if(playCount>=5)finishGame();else{moveStar();toast(`${playCount} / 5 estrellas`);}});

const sensors=new Sensors({
  noise:value=>{pet.environment.noise=Math.round(value);$('#noise').value=value;update();},
  motion:()=>perform('shake'),gesture:perform,gaze:(x,y)=>eyes.look(x,y),
  light:value=>{if(value<.09&&!pet.asleep&&Date.now()-(pet.lastDark||0)>90000){pet.lastDark=Date.now();affect(pet,'sleepy',5000);update();}},
  status:(name,state,message)=>{const button=$(`#${name}-toggle`);button.textContent=state==='loading'?'Preparando…':state==='on'?'Apagar':'Activar';button.setAttribute('aria-pressed',String(state==='on'));button.dataset.state=state;button.disabled=state==='loading';if(message)$(`#${name}-note`).textContent=message;if(state==='error')toast(message);if(name==='microphone')$('#noise').disabled=state==='on';}
});

const profile=()=>({id:pet.id,name:pet.name,palette:pet.palette,shape:pet.shape,trait:pet.trait});
const meetings=new Meetings({profile,
  status:(state,message)=>{
    $('#meet-status').textContent=state==='connected'?`Sala ${message}`:state==='connecting'?'Conectando…':'Sin conectar';
    $('#online-status span').textContent=state==='connected'?`SALA ${message}`:'EN TU MUNDO';$('#room-form button').disabled=state==='connecting';$('#meet-actions').hidden=state!=='connected';
    if(state==='error'||(state==='disconnected'&&message))toast(message);if(state==='connected')toast(`Sala ${message}. Comparte el código con otro iPhone.`);
  },
  peers:list=>{peers=list;const container=$('#peer-list');container.replaceChildren();for(const other of list){
    if(!seenPeers.has(other.id)&&encounter(pet,other)){seenPeers.add(other.id);eyes.spark();tone('play');toast(`${other.name} acaba de entrar en tu pequeño universo.`);update();save();}
    const row=document.createElement('div');row.className='peer';const canvas=document.createElement('canvas');row.append(canvas);eyes.thumbnail(canvas,other.palette,other.shape);const info=document.createElement('div');const name=document.createElement('strong');name.textContent=other.name;const description=document.createElement('small');description.textContent=`${TRAITS[other.trait]} · ${PALETTE_NAMES[other.palette]}`;info.append(name,description);row.append(info);container.append(row);
  }},
  action:message=>{const other=message.from;if(message.action==='wave'){affect(pet,'loved',7000);eyes.spark('heart');toast(`${other.name} te saluda.`);}if(message.action==='play'){action(pet,'play');tone('play');eyes.spark();toast(`${other.name} quiere jugar contigo.`);}if(message.action==='swap'){equip(pet,other.palette,other.shape);eyes.setLook(pet.palette,pet.shape);remember(pet,`Intercambié mis ojos con ${other.name}.`);toast(`Ahora tienes los ojos de ${other.name}.`);meetings.refresh();}update();save();}
});

function openPanel(name){
  activePanel=name;const titles={eyes:'Ojos',care:'Cuidados',environment:'Ambiente',meet:'Encuentros',diary:'Diario',settings:'Ajustes'};$('#panel-title').textContent=titles[name];
  $$('[data-section]').forEach(s=>s.hidden=s.dataset.section!==name);$$('.panel-nav [data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
  if(!panel.open)panel.showModal();$('.panel-content').scrollTop=0;update();if(name==='eyes'){catalogShape=pet.shape;renderCatalog();}if(name==='diary')renderDiary();
}
function closePanel(){panel.close();activePanel='';}
$$('[data-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.panel)));$('#identity-button').addEventListener('click',()=>openPanel('care'));$('#close-panel').addEventListener('click',closePanel);
panel.addEventListener('click',event=>{if(event.target===panel){const rect=panel.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePanel();}});
panel.addEventListener('close',()=>activePanel='');$$('[data-action]').forEach(b=>b.addEventListener('click',()=>perform(b.dataset.action)));
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
    button.addEventListener('click',()=>{equip(pet,palette,Number(button.dataset.shape));eyes.setLook(pet.palette,pet.shape);affect(pet,'happy',3000);remember(pet,`Hoy miro el mundo con ojos ${name}.`);update();save();meetings.refresh();renderCatalog();haptic();});container.append(button);canvases.push(canvas);
  }
  if(!canvases.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='Todavía no hay ojos aquí. Prueba otra forma o descubre un color nuevo.';container.append(empty);return;}
  catalogObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){const c=entry.target;eyes.thumbnail(c,Number(c.dataset.palette),Number(c.dataset.shape));catalogObserver.unobserve(c);}}},{root:$('.panel-content'),rootMargin:'100px'});canvases.forEach(c=>catalogObserver.observe(c));
}
$$('[data-shape]').forEach(b=>b.addEventListener('click',()=>{catalogShape=Number(b.dataset.shape);renderCatalog();}));$('#eye-search').addEventListener('input',renderCatalog);$('#collection-only').addEventListener('change',renderCatalog);
$('#random-eyes').addEventListener('click',()=>{const look=randomLook();equip(pet,look.palette,look.shape);eyes.setLook(pet.palette,pet.shape);catalogShape=pet.shape;remember(pet,`Descubrí mis ojos ${PALETTE_NAMES[pet.palette]}.`);affect(pet,'happy',5000);eyes.spark();update();save();meetings.refresh();renderCatalog();toast(`${PALETTE_NAMES[pet.palette]} · ${rarity(pet.palette)}`);});
function renderDiary(){const container=$('#memory-list');container.replaceChildren();if(!pet.memory.length){container.textContent='La historia empieza contigo.';return;}for(const memory of pet.memory){const item=document.createElement('div');item.className='memory-item';const star=document.createElement('span');star.textContent='✦';const body=document.createElement('div');const text=document.createElement('p');text.textContent=memory.text;const date=document.createElement('small');date.textContent=new Date(memory.at).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});body.append(text,date);item.append(star,body);container.append(item);}}

$('#room-form').addEventListener('submit',event=>{event.preventDefault();if(!navigator.onLine){toast('Los encuentros necesitan conexión a internet.');return;}seenPeers=new Set();meetings.join($('#room-code').value);});$('#new-room').addEventListener('click',()=>{$('#room-code').value=Math.random().toString(36).slice(2,8).toUpperCase();$('#room-code').focus();});$('#leave-room').addEventListener('click',()=>{meetings.leave();seenPeers.clear();});
$$('[data-meet]').forEach(b=>b.addEventListener('click',()=>{
  if(!peers.length){toast('Espera a que entre otro Starboy en la sala.');return;}
  const type=b.dataset.meet,target=type==='swap'?peers[0].id:undefined;if(!meetings.send(type,target)){toast('La sala está desconectada. Vuelve a entrar.');return;}
  if(type==='swap'){const other=peers[0];equip(pet,other.palette,other.shape);eyes.setLook(pet.palette,pet.shape);remember(pet,`Intercambié mis ojos con ${other.name}.`);meetings.refresh();toast(`Ojos intercambiados con ${other.name}.`);}else if(type==='play'){action(pet,'play');eyes.spark();tone('play');toast('Una estrella para compartir.');}else{affect(pet,'loved',5000);eyes.spark('heart');toast('Un saludo desde tu pequeño universo.');}update();save();
}));

function toggleSound(value){pet.settings.sound=value;update();save();if(value)tone();}
$('#sound-toggle').addEventListener('click',()=>toggleSound(!pet.settings.sound));$('#sound-setting').addEventListener('change',event=>toggleSound(event.target.checked));$('#reduced-motion').addEventListener('change',event=>{pet.settings.reducedMotion=event.target.checked;update();save();});$('#rename').addEventListener('change',event=>{pet.name=event.target.value.trim().slice(0,24)||'Starboy';update();save();meetings.refresh();});
$('#export-pet').addEventListener('click',()=>{save();const url=URL.createObjectURL(new Blob([JSON.stringify(pet,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='mi-starboy.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Guarda el archivo para llevar tu mascota a otro dispositivo.');});
$('#import-pet').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>500000)throw new Error();const imported=restorePet(await file.text());if(!imported)throw new Error();if(!confirm('¿Sustituir tu mascota actual por la del archivo?'))return;sensors.stopAll();meetings.leave();pet=imported;eyes.pet=pet;eyes.setLook(pet.palette,pet.shape);$('#temperature').value=pet.environment.temperature;$('#noise').value=pet.environment.noise;update();save();toast('Tu pequeño compañero vuelve a casa.');}catch{toast('Este archivo no contiene una mascota válida.');}finally{event.target.value='';}});
$('#reset-pet').addEventListener('click',()=>{if(!confirm('¿Comenzar una nueva vida? Exporta antes tu mascota si quieres conservarla.'))return;sensors.stopAll();meetings.leave();clearTimeout(playTimer);$('#play-star').hidden=true;pet=createPet();eyes.pet=pet;eyes.setLook(pet.palette,pet.shape);remember(pet,'Abrí los ojos por primera vez.');$('#temperature').value=22;$('#noise').value=0;update();save();closePanel();$('#first-name').value='Starboy';welcomePending=true;syncWelcome();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});$('#install-button').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;}else toast('En Safari: Compartir → Añadir a pantalla de inicio. Desactiva el bloqueo de orientación del iPhone.');});
async function keepAwake(){if(!navigator.wakeLock)return;try{wakeLock=await navigator.wakeLock.request('screen');}catch{}}
$('#immersive-button').addEventListener('click',async()=>{$('#universe').classList.add('immersive');keepAwake();try{await document.documentElement.requestFullscreen?.();}catch{}try{await screen.orientation.lock('landscape');}catch{}});
function rotationBlocked(){return matchMedia('(orientation: portrait) and (max-width: 700px)').matches&&!document.body.classList.contains('portrait-allowed');}
function syncWelcome(){if(!initialized||!welcomePending)return;if(rotationBlocked()){if($('#welcome').open)$('#welcome').close();}else if(!$('#welcome').open)$('#welcome').showModal();}
$('#eyes').addEventListener('pointermove',event=>{eyes.look((event.clientX/innerWidth-.5)*1.2,(event.clientY/innerHeight-.5)*.8);});$('#eyes').addEventListener('pointerleave',()=>eyes.look(0,0));$('#eyes').addEventListener('click',()=>{if($('#universe').classList.contains('immersive')){$('#universe').classList.remove('immersive');return;}perform('pet');});$('#portrait-continue').addEventListener('click',()=>{document.body.classList.add('portrait-allowed');syncWelcome();});
window.addEventListener('resize',()=>{if(rotationBlocked()&&panel.open)closePanel();syncWelcome();});
$('#hatch').addEventListener('click',()=>{welcomePending=false;pet.name=$('#first-name').value.trim().slice(0,24)||'Starboy';remember(pet,'Abrí los ojos y te conocí.');$('#welcome').close();affect(pet,'loved',8000);eyes.spark('heart');tone();keepAwake();update();save();toast(`Hola, ${pet.name}. Bienvenido a tu pequeño universo.`);});
$('#welcome').addEventListener('cancel',event=>event.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();wakeLock?.release().catch(()=>{});}else{advance(pet);update();if(wakeLock)keepAwake();}});
window.addEventListener('pagehide',()=>{sensors.stopAll();meetings.leave();save();});window.addEventListener('online',()=>toast('De vuelta en el universo.'));window.addEventListener('offline',()=>toast('Sin conexión. Tu mascota y sus ojos siguen contigo.'));
let lastSaved=Date.now();setInterval(()=>{update();if(!document.hidden&&Date.now()>nextBehavior){nextBehavior=Date.now()+40000+Math.random()*50000;if(!pet.asleep&&!pet.effect&&['happy','curious'].includes(mood(pet))){const behaviors=pet.behaviors||[pet.trait],behavior=behaviors[Math.floor(Math.random()*behaviors.length)];affect(pet,{curious:'curious',playful:'playful',dreamy:'sleepy',shy:'loved'}[behavior],5000);eyes.look((Math.random()-.5)*.8,(Math.random()-.5)*.5);update();}}if(Date.now()-lastSaved>10000){save();lastSaved=Date.now();}},1000);
update();const engine=await eyes.init();$('#engine-note').textContent=`Port web experimental inspirado en Starboy de CREATURE. Ojos: ${engine==='original'?'motor original':'motor de reserva'}. Los cuidados y encuentros son funciones de esta adaptación.`;
initialized=true;if(firstLife)syncWelcome();else{save();keepAwake();}
window.starboy={get pet(){return pet;},get engine(){return eyes.engine;},sensors,meetings,eyes};
