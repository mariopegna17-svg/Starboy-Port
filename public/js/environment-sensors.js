const ENVIRONMENT_SERVICE=0x181a;
const TEMPERATURE_CHARACTERISTIC=0x2a6e;

export const ENVIRONMENT_NOTES={
  temperature:'Conecta un termómetro Bluetooth con servicio Environmental Sensing.',
  light:'Mide la iluminación con el sensor de luz del dispositivo, cuando el navegador lo permite.'
};

// Bluetooth SIG Temperature (0x2A6E): signed little-endian hundredths of °C.
export function decodeTemperature(value){
  if(!value||typeof value.getInt16!=='function'||value.byteLength<2)throw new Error('Medición de temperatura incompleta.');
  const celsius=value.getInt16(0,true)/100;
  if(!Number.isFinite(celsius)||celsius<-273.15||celsius>327.67)throw new Error('El termómetro envió una temperatura inválida.');
  return celsius;
}

export class EnvironmentSensors {
  constructor(callbacks={},environment=globalThis){
    this.callbacks=callbacks;this.environment=environment;
    this.state={temperature:'off',light:'off'};this.states=this.state;
    this.generation={temperature:0,light:0};
    this.visibilityHandler=()=>{if(this.environment.document?.hidden)this.pause();};
    this.environment.document?.addEventListener('visibilitychange',this.visibilityHandler);
  }
  available(name){
    if(this.environment.isSecureContext===false)return false;
    if(name==='temperature')return typeof this.environment.navigator?.bluetooth?.requestDevice==='function';
    if(name==='light')return typeof this.environment.AmbientLightSensor==='function';
    return false;
  }
  note(name){
    if(this.environment.isSecureContext===false)return 'Los sensores reales necesitan HTTPS. Abre la app desde su dirección segura.';
    if(this.available(name))return ENVIRONMENT_NOTES[name];
    if(name==='temperature')return 'iPhone y Safari no exponen un termómetro ambiental. Usa temperatura manual o un termómetro Bluetooth Environmental Sensing en un navegador compatible.';
    if(name==='light')return 'Este navegador no expone un sensor de luz real. La cámara puede reaccionar al brillo de la imagen cuando está activa.';
    return '';
  }
  status(name,state,message=this.note(name)){
    this.state[name]=state;this.callbacks.status?.(name,state,message);
  }
  async toggle(name){
    if(!Object.hasOwn(this.state,name))return;
    if(['on','loading'].includes(this.state[name]))this.stop(name);
    else await this[name]();
  }
  async temperature(){
    const generation=++this.generation.temperature;
    this.status('temperature','loading','Selecciona tu termómetro Bluetooth. Puedes cancelar mientras conecta.');
    let device,stage='selection';
    const stale=()=>generation!==this.generation.temperature;
    const releaseStale=()=>{if(this.device!==device&&device?.gatt?.connected)try{device.gatt.disconnect();}catch{}};
    try{
      if(!this.available('temperature'))throw new Error(this.note('temperature'));
      // Calling requestDevice before the first await preserves the activation tap.
      device=await this.environment.navigator.bluetooth.requestDevice({filters:[{services:[ENVIRONMENT_SERVICE]}],optionalServices:[ENVIRONMENT_SERVICE]});
      if(stale()){releaseStale();return;}
      if(!device?.gatt)throw new Error('Este dispositivo no ofrece conexión Bluetooth GATT.');
      this.device=device;stage='connection';
      this.disconnectHandler=()=>{
        if(stale()||this.device!==device)return;
        this.stop('temperature');
        this.status('temperature','error','Termómetro desconectado. Toca Activar para volver a conectarlo.');
      };
      device.addEventListener('gattserverdisconnected',this.disconnectHandler);
      const server=await device.gatt.connect();
      if(stale()){releaseStale();return;}
      stage='service';
      const service=await server.getPrimaryService(ENVIRONMENT_SERVICE);
      if(stale()){releaseStale();return;}
      const characteristic=await service.getCharacteristic(TEMPERATURE_CHARACTERISTIC);
      if(stale()){releaseStale();return;}
      this.temperatureCharacteristic=characteristic;
      const canNotify=characteristic.properties?.notify||characteristic.properties?.indicate;
      const canRead=typeof characteristic.readValue==='function'&&characteristic.properties?.read!==false;
      if(!canNotify&&!canRead)throw new Error('El termómetro no permite leer ni recibir su temperatura.');
      this.temperatureHandler=event=>{if(!stale())this.readTemperature(event.target.value,device);};
      if(canNotify){
        characteristic.addEventListener('characteristicvaluechanged',this.temperatureHandler);
        await characteristic.startNotifications();
        if(stale()){
          // A later activation can reuse the same Bluetooth characteristic.
          if(this.temperatureCharacteristic!==characteristic)try{characteristic.stopNotifications?.().catch(()=>{});}catch{}
          releaseStale();return;
        }
      }
      this.status('temperature','on',`Conectado a ${device.name||'tu termómetro'}. Esperando una medición real.`);
      const read=async()=>{
        if(stale()||this.temperatureReading)return;
        this.temperatureReading=true;
        try{
          const value=await characteristic.readValue();
          if(!stale())this.readTemperature(value,device);
        }catch(error){
          if(!stale())this.status('temperature','on',canNotify?'Esperando la próxima medición del termómetro.':'No se pudo leer el termómetro. Volverá a intentarse en unos segundos.');
        }finally{if(!stale())this.temperatureReading=false;}
      };
      if(canRead)await read();
      if(stale()){releaseStale();return;}
      if(!canNotify)this.temperatureTimer=setInterval(read,5000);
    }catch(error){
      if(stale()){releaseStale();return;}
      this.stop('temperature');
      let message=error.message||'No se pudo conectar el termómetro.';
      if(error.name==='NotFoundError')message=stage==='selection'?'No se seleccionó ningún termómetro compatible. Puedes volver a intentarlo.':'El termómetro necesita el servicio Environmental Sensing y la característica Temperature.';
      if(error.name==='NotAllowedError')message='Permiso de Bluetooth denegado. Permite la conexión y vuelve a tocar Activar.';
      if(error.name==='NetworkError')message='No se pudo conectar el termómetro. Acércalo, enciéndelo y vuelve a intentarlo.';
      if(error.name==='SecurityError')message='Bluetooth necesita HTTPS y un navegador compatible. En iPhone puedes usar la temperatura manual.';
      this.status('temperature','error',message);
    }
  }
  readTemperature(value,device){
    try{
      const celsius=decodeTemperature(value);
      this.callbacks.temperature?.(celsius);
      if(this.device!==device)return;
      this.status('temperature','on',`${celsius.toFixed(1)} °C reales · ${device.name||'termómetro Bluetooth'}`);
    }catch(error){this.status('temperature','on',error.message);}
  }
  async light(){
    const generation=++this.generation.light;
    this.status('light','loading','Preparando el sensor de luz real.');
    try{
      if(!this.available('light'))throw new Error(this.note('light'));
      const sensor=new this.environment.AmbientLightSensor({frequency:2});this.lightSensor=sensor;
      const active=()=>generation===this.generation.light;
      this.lightReadingHandler=()=>{
        if(!active()||!Number.isFinite(sensor.illuminance)||sensor.illuminance<0)return;
        const lux=sensor.illuminance;
        // Preserve physical lux alongside a logarithmic brightness for reactions.
        this.callbacks.light?.(Math.min(1,Math.log10(lux+1)/4),lux);
        if(!active())return;
        this.status('light','on',`${Math.round(lux)} lux reales · sensor de luz`);
      };
      this.lightErrorHandler=event=>{
        if(!active())return;
        const error=event.error||event;
        this.stop('light');
        this.status('light','error',error.name==='NotAllowedError'?'Permiso del sensor de luz denegado. Revisa los permisos del navegador.':'El sensor de luz no está disponible en este dispositivo.');
      };
      sensor.addEventListener('reading',this.lightReadingHandler);
      sensor.addEventListener('error',this.lightErrorHandler);
      this.lightActivateHandler=()=>{if(active())this.status('light','on','Sensor de luz activo. Esperando una medición real.');};
      sensor.addEventListener('activate',this.lightActivateHandler);
      sensor.start();
    }catch(error){
      if(generation!==this.generation.light)return;
      this.stop('light');
      this.status('light','error',error.name==='SecurityError'?'El navegador bloquea el sensor de luz. Usa HTTPS y comprueba sus permisos.':error.message||'No se pudo activar el sensor de luz.');
    }
  }
  stop(name){
    if(!Object.hasOwn(this.state,name))return;
    ++this.generation[name];
    if(name==='temperature'){
      clearInterval(this.temperatureTimer);this.temperatureTimer=null;this.temperatureReading=false;
      const characteristic=this.temperatureCharacteristic;
      if(characteristic){
        characteristic.removeEventListener('characteristicvaluechanged',this.temperatureHandler);
        try{characteristic.stopNotifications?.().catch(()=>{});}catch{}
      }
      const device=this.device;
      if(device){device.removeEventListener('gattserverdisconnected',this.disconnectHandler);if(device.gatt?.connected)try{device.gatt.disconnect();}catch{}}
      this.temperatureCharacteristic=null;this.device=null;this.temperatureHandler=null;this.disconnectHandler=null;
    }
    if(name==='light'&&this.lightSensor){
      this.lightSensor.removeEventListener('reading',this.lightReadingHandler);
      this.lightSensor.removeEventListener('error',this.lightErrorHandler);
      this.lightSensor.removeEventListener('activate',this.lightActivateHandler);
      try{this.lightSensor.stop();}catch{}this.lightSensor=null;
    }
    this.status(name,'off');
  }
  pause(){
    for(const name of Object.keys(this.state))if(['on','loading'].includes(this.state[name])){
      this.stop(name);this.status(name,'paused','Pausado al salir de la app. Toca Reanudar para conectar el sensor.');
    }
  }
  stopAll(){for(const name of Object.keys(this.state))this.stop(name);}
}
