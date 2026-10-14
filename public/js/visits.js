import { Eyes } from './eyes.js';
import { createPet, action, affect, mood } from './pet.js';

// The other pet is a temporary rendering, never a replacement for the saved pet.
export class Visits {
  constructor({container,myId,settings,onLeave,onAction,role}) {
    this.container=container;this.myId=myId;this.settings=settings;this.onLeave=onLeave;this.onAction=onAction;this.role=role;
    this.current=null;this.eyes=null;this.pet=null;this.key='';this.remoteMood='happy';
    this.canvas=document.createElement('canvas');this.canvas.id='visitor-eyes';this.canvas.setAttribute('aria-label','Ojos de la mascota de visita');
    this.caption=document.createElement('div');this.caption.className='visitor-caption';
    this.name=document.createElement('strong');this.description=document.createElement('small');this.caption.append(this.name,this.description);
    this.exit=document.createElement('button');this.exit.type='button';this.exit.className='visitor-exit';this.exit.addEventListener('click',()=>this.onLeave?.());
    const actions=document.createElement('div');actions.className='visitor-actions';
    for(const [type,label] of [['pet','♡ Caricia'],['feed','✦ Compartir comida'],['play','★ Jugar juntos']]) {
      const button=document.createElement('button');button.type='button';button.dataset.visitAction=type;button.textContent=label;
      button.addEventListener('click',()=>this.onAction?.(type,this.pet?.id));actions.append(button);
    }
    this.canvas.addEventListener('pointermove',event=>{
      const box=this.canvas.getBoundingClientRect();this.eyes?.look((event.clientX-box.left)/box.width-.5,(event.clientY-box.top)/box.height-.5);
    });
    this.canvas.addEventListener('pointerleave',()=>this.eyes?.look(0,0));
    this.canvas.addEventListener('click',()=>this.onAction?.('pet',this.pet?.id));
    this.container.replaceChildren(this.canvas,this.caption,this.exit,actions);this.container.hidden=true;
  }
  update(list=[]) {
    const id=typeof this.myId==='function'?this.myId():this.myId;
    const visit=list.find(item=>item.host?.id===id||item.guest?.id===id);
    if(!visit){this.clear();return;}
    const role=visit.guest.id===id?'guest':'host',other=role==='guest'?visit.host:visit.guest;
    const key=`${visit.host.id}/${visit.guest.id}`;
    const entering=this.key!==key;this.current={role,other,host:visit.host,guest:visit.guest};
    if(this.key!==key) {
      this.eyes?.destroy();this.key=key;this.pet={...createPet(),...other,hatched:true,behaviors:[other.trait]};
      const settings=typeof this.settings==='function'?this.settings():this.settings;
      this.pet.settings={sound:false,reducedMotion:settings?.reducedMotion===true};
      this.eyes=new Eyes(this.canvas,this.pet);
      this.eyes.idleAllowed=()=>!this.container.hidden&&!document.querySelector('#control-panel')?.open;
      this.eyes.look(role==='guest'?.2:-.2,0);
      this.eyes.onFrame=()=>{if(this.eyes)this.eyes.mood=this.pet.effect?.until>Date.now()?mood(this.pet):this.remoteMood;};
      this.eyes.init();this.eyes.react('wave');
    } else {
      this.pet.name=other.name;this.pet.trait=other.trait;
      if(this.pet.palette!==other.palette||this.pet.shape!==other.shape){this.pet.palette=other.palette;this.pet.shape=other.shape;this.eyes.setLook(other.palette,other.shape);}
      const settings=typeof this.settings==='function'?this.settings():this.settings;
      this.pet.settings.reducedMotion=settings?.reducedMotion===true;
    }
    this.remoteMood=other.mood||'happy';this.eyes.mood=this.remoteMood;
    this.name.textContent=other.name;this.description.textContent=role==='guest'?'Estás dentro de su universo':'Ha entrado en tu universo';
    this.exit.textContent=role==='guest'?'Volver a mi universo':'Despedir visita';
    this.container.hidden=false;document.body.classList.add('visiting');if(entering)this.role?.(this.current);
  }
  react(message) {
    if(!this.eyes||!this.pet)return;
    if(message.to?.id===this.pet.id||message.from?.id===this.pet.id) {
      if(message.action==='wave')affect(this.pet,'loved',4000);else action(this.pet,message.action);
      this.eyes.react(message.action==='thumbs'?'wave':message.action);this.eyes.mood=mood(this.pet);
    }
  }
  clear() {
    const active=!!this.current;this.eyes?.destroy();this.eyes=null;this.pet=null;this.current=null;this.key='';
    this.container.hidden=true;document.body.classList.remove('visiting');if(active)this.role?.(null);
  }
  destroy() {this.clear();this.container.replaceChildren();}
}
