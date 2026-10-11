import { PALETTE_NAMES, RARITY_GROUPS } from './palettes.js';

export const STORAGE_KEY='starboy.pet.v1';
export const TRAITS={curious:'Curioso',shy:'Tímido',playful:'Juguetón',dreamy:'Soñador'};
export const MOODS={happy:'Feliz',curious:'Curioso',sleepy:'Con sueño',asleep:'Soñando',hungry:'Tengo hambre',anxious:'Nervioso',cold:'Tengo frío',hot:'Tengo calor',dizzy:'Mareado',angry:'Enfadado',sad:'Triste',playful:'A jugar',loved:'Querido'};
export const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));
export function rarity(palette){let offset=0;for(const group of RARITY_GROUPS){offset+=group.count;if(palette<offset)return group.weight<=.2?'Legendario':group.weight<=.3?'Épico':group.weight<=.5?'Raro':'Común';}return 'Común';}
export function randomLook(rng=Math.random){const weights=RARITY_GROUPS.flatMap(g=>Array(g.count).fill(g.weight));let n=rng()*weights.reduce((a,b)=>a+b,0),palette=0;for(;palette<99;palette++){n-=weights[palette];if(n<=0)break;}return {palette,shape:Math.floor(rng()*4)};}
export function createPet(now=Date.now(),rng=Math.random){const look=randomLook(rng),trait=Object.keys(TRAITS)[Math.floor(rng()*4)];return {version:1,id:globalThis.crypto?.randomUUID?.()||`pet-${now}-${Math.floor(rng()*1e9)}`,name:'Starboy',born:now,updated:now,trait,behaviors:[trait],...look,collection:[`${look.shape}-${look.palette}`],energy:85,hunger:85,happiness:85,bond:10,asleep:false,environment:{temperature:22,noise:0},effect:null,memory:[],settings:{sound:false,reducedMotion:false},encounters:0};}
export function restorePet(raw,now=Date.now()){
  try{const p=JSON.parse(raw);if(p?.version!==1||typeof p.id!=='string'||!Number.isFinite(p.born)||!Number.isFinite(p.updated)||![p.energy,p.hunger,p.happiness,p.bond].every(Number.isFinite)||!Number.isInteger(p.palette)||p.palette<0||p.palette>99||!Number.isInteger(p.shape)||p.shape<0||p.shape>3) return null;
    p.name=String(p.name||'Starboy').slice(0,24);p.trait=Object.hasOwn(TRAITS,p.trait)?p.trait:'curious';p.settings={sound:p.settings?.sound===true,reducedMotion:p.settings?.reducedMotion===true};p.environment={temperature:Number.isFinite(p.environment?.temperature)?clamp(p.environment.temperature,-5,45):22,noise:Number.isFinite(p.environment?.noise)?clamp(p.environment.noise):0};p.effect=null;p.asleep=p.asleep===true;p.encounters=Number.isFinite(p.encounters)?Math.max(0,Math.floor(p.encounters)):0;p.memory=Array.isArray(p.memory)?p.memory.filter(m=>m&&typeof m.text==='string'&&Number.isFinite(m.at)).slice(0,60).map(m=>({text:m.text.slice(0,160),at:m.at})):[];p.collection=Array.isArray(p.collection)?[...new Set(p.collection.filter(s=>typeof s==='string'&&/^[0-3]-\d{1,2}$/.test(s)&&Number(s.split('-')[1])<100))].slice(0,400):[];p.behaviors=Array.isArray(p.behaviors)?[...new Set(p.behaviors.filter(trait=>Object.hasOwn(TRAITS,trait)))]:[p.trait];if(!p.behaviors.includes(p.trait))p.behaviors.push(p.trait);unlock(p);advance(p,now);return p;
  }catch{return null;}
}
export function remember(p,text,now=Date.now()){p.memory.unshift({text,at:now});p.memory=p.memory.slice(0,60);}
export function unlock(p){const id=`${p.shape}-${p.palette}`;if(!p.collection.includes(id))p.collection.push(id);}
export function advance(p,now=Date.now()){
  const minutes=Math.max(0,Math.min((now-p.updated)/60000,720));p.updated=now;
  p.hunger=clamp(p.hunger-minutes*.065);p.energy=clamp(p.energy+minutes*(p.asleep?.25:-.035));p.happiness=clamp(p.happiness-minutes*.025);
  if(p.effect?.until<=now)p.effect=p.effect.next?.until>now?p.effect.next:null;
}
export function mood(p,now=Date.now()){
  if(p.asleep)return 'asleep';if(p.effect?.until>now)return p.effect.mood;
  if(p.environment.temperature<15)return 'cold';if(p.environment.temperature>32)return 'hot';
  if(p.environment.noise>(p.trait==='shy'?40:62))return 'anxious';if(p.energy<25)return 'sleepy';if(p.hunger<25)return 'hungry';if(p.happiness<25)return 'sad';return p.trait==='curious'?'curious':'happy';
}
export function affect(p,state,duration=6000,now=Date.now()){p.effect={mood:state,until:now+duration};}
export function action(p,type,now=Date.now()){
  advance(p,now);
  if(type==='feed'){p.hunger=clamp(p.hunger+25);p.happiness=clamp(p.happiness+5);affect(p,'happy',7000,now);remember(p,'Un pequeño festín de estrellas.',now);}
  if(type==='pet'){p.bond=clamp(p.bond+2);p.happiness=clamp(p.happiness+8);affect(p,'loved',4000,now);}
  if(type==='play'){p.asleep=false;p.energy=clamp(p.energy-5);p.happiness=clamp(p.happiness+15);p.bond=clamp(p.bond+3);affect(p,'playful',10000,now);remember(p,'Jugamos a perseguir una estrella.',now);}
  if(type==='sleep'){p.asleep=!p.asleep;p.effect=null;remember(p,p.asleep?'Me fui a soñar.':'Volví de un sueño.',now);}
  if(type==='shake'){p.asleep=false;p.happiness=clamp(p.happiness-4);affect(p,'dizzy',7000,now);p.effect.next={mood:'angry',until:now+12000};remember(p,'El mundo dio demasiadas vueltas.',now);}
  if(type==='middle'){p.happiness=clamp(p.happiness-5);affect(p,'sad',8000,now);remember(p,'Ese gesto no me gustó.',now);}
  if(type==='thumbs'){affect(p,'happy',4000,now);}
  if(type==='calm'){p.environment.noise=0;p.happiness=clamp(p.happiness+4);affect(p,'loved',6000,now);}
}
export function equip(p,palette,shape){if(!Number.isInteger(palette)||palette<0||palette>=PALETTE_NAMES.length||!Number.isInteger(shape)||shape<0||shape>3)return false;p.palette=palette;p.shape=shape;unlock(p);return true;}
export function encounter(p,other,now=Date.now()){
  if(!other||other.id===p.id||!Number.isInteger(other.palette)||other.palette<0||other.palette>99||!Number.isInteger(other.shape)||other.shape<0||other.shape>3)return false;
  const id=`${other.shape}-${other.palette}`;if(!p.collection.includes(id))p.collection.push(id);p.behaviors||=[p.trait];if(Object.hasOwn(TRAITS,other.trait)&&!p.behaviors.includes(other.trait)){p.behaviors.push(other.trait);remember(p,`Aprendí un comportamiento ${TRAITS[other.trait].toLowerCase()} de ${String(other.name||'Starboy').slice(0,24)}.`,now);}p.encounters++;p.bond=clamp(p.bond+4);p.happiness=clamp(p.happiness+12);affect(p,'playful',8000,now);remember(p,`Conocí a ${String(other.name||'Starboy').slice(0,24)} y descubrí sus ojos.`,now);return true;
}
