import test from 'node:test';
import assert from 'node:assert/strict';
import {EnvironmentSensors,decodeTemperature} from '../public/js/environment-sensors.js';

function value(celsius){const bytes=new DataView(new ArrayBuffer(2));bytes.setInt16(0,Math.round(celsius*100),true);return bytes;}
function thermometer({connect,requestDevice}={}){
  const characteristic=new EventTarget();
  Object.assign(characteristic,{
    properties:{read:true,notify:true},value:value(22.25),notificationStarts:0,notificationStops:0,
    async readValue(){return this.value;},
    async startNotifications(){this.notificationStarts++;return this;},
    async stopNotifications(){this.notificationStops++;return this;},
    publish(celsius){this.value=value(celsius);this.dispatchEvent(new Event('characteristicvaluechanged'));}
  });
  const device=new EventTarget();device.name='Termómetro de prueba';
  const server={async getPrimaryService(uuid){assert.equal(uuid,0x181a);return {async getCharacteristic(id){assert.equal(id,0x2a6e);return characteristic;}};}};
  device.gatt={connected:false,async connect(){if(connect)await connect();this.connected=true;return server;},disconnect(){if(!this.connected)return;this.connected=false;device.dispatchEvent(new Event('gattserverdisconnected'));}};
  const environment={isSecureContext:true,navigator:{bluetooth:{async requestDevice(options){assert.deepEqual(options.filters,[{services:[0x181a]}]);if(requestDevice)await requestDevice();return device;}}}};
  return {environment,device,characteristic};
}

test('la característica estándar convierte temperatura negativa y centésimas sin inventar una lectura',()=>{
  assert.equal(decodeTemperature(value(-12.34)),-12.34);
  assert.equal(decodeTemperature(value(26.57)),26.57);
  assert.throws(()=>decodeTemperature(new DataView(new ArrayBuffer(1))),/incompleta/);
  assert.throws(()=>decodeTemperature(value(-327.68)),/inválida/);
});

test('el termómetro real recibe lectura inicial y notificaciones y se libera al apagarlo',async t=>{
  const fixture=thermometer(),readings=[],statuses=[];
  const sensors=new EnvironmentSensors({temperature:value=>readings.push(value),status:(...args)=>statuses.push(args)},fixture.environment);
  t.after(()=>sensors.stopAll());
  assert.equal(sensors.available('temperature'),true);
  await sensors.toggle('temperature');
  assert.equal(sensors.state.temperature,'on');assert.deepEqual(readings,[22.25]);
  fixture.characteristic.publish(19.75);assert.deepEqual(readings,[22.25,19.75]);
  sensors.stop('temperature');
  assert.equal(fixture.device.gatt.connected,false);assert.equal(sensors.state.temperature,'off');
  fixture.characteristic.publish(40);assert.deepEqual(readings,[22.25,19.75]);
  assert.ok(fixture.characteristic.notificationStops>0);assert.match(statuses.find(item=>item[2].includes('19.8'))[2],/reales/);
});

test('una desconexión física informa del problema y permite conectar de nuevo',async t=>{
  const fixture=thermometer(),statuses=[];
  const sensors=new EnvironmentSensors({status:(...args)=>statuses.push(args)},fixture.environment);t.after(()=>sensors.stopAll());
  await sensors.temperature();fixture.device.gatt.disconnect();
  assert.equal(sensors.state.temperature,'error');assert.match(statuses.at(-1)[2],/desconectado/);
  await sensors.toggle('temperature');assert.equal(sensors.state.temperature,'on');
});

test('cancelar el selector de Bluetooth no conecta ni entrega medidas cuando el permiso termina después',async()=>{
  let finish;const fixture=thermometer({requestDevice:()=>new Promise(resolve=>finish=resolve)}),readings=[];
  const sensors=new EnvironmentSensors({temperature:value=>readings.push(value)},fixture.environment);
  const pending=sensors.temperature();sensors.stop('temperature');finish();await pending;
  assert.equal(sensors.state.temperature,'off');assert.equal(fixture.device.gatt.connected,false);assert.deepEqual(readings,[]);
});

test('cancelar una conexión en curso desconecta la conexión que termina tarde',async()=>{
  let finish;const fixture=thermometer({connect:()=>new Promise(resolve=>finish=resolve)});
  const sensors=new EnvironmentSensors({},fixture.environment),pending=sensors.temperature();
  while(!finish)await Promise.resolve();
  sensors.stop('temperature');finish();await pending;
  assert.equal(sensors.state.temperature,'off');assert.equal(fixture.device.gatt.connected,false);
});

test('Safari sin Web Bluetooth conserva el ajuste manual y no finge un termómetro interno',async()=>{
  const readings=[],statuses=[],sensors=new EnvironmentSensors({temperature:value=>readings.push(value),status:(...args)=>statuses.push(args)},{navigator:{},isSecureContext:true});
  assert.equal(sensors.available('temperature'),false);await sensors.toggle('temperature');
  assert.equal(sensors.state.temperature,'error');assert.match(statuses.at(-1)[2],/temperatura manual/);assert.deepEqual(readings,[]);
});

test('un sensor de luz nativo entrega lux reales, se detiene en segundo plano y elimina sus listeners',async()=>{
  let native;
  class AmbientLightSensor extends EventTarget {
    constructor(){super();native=this;this.illuminance=null;}
    start(){this.dispatchEvent(new Event('activate'));}
    stop(){this.stopped=true;}
  }
  const document=new EventTarget();document.hidden=false;
  const readings=[],sensors=new EnvironmentSensors({light:(...args)=>readings.push(args)},{AmbientLightSensor,document,isSecureContext:true});
  await sensors.toggle('light');assert.equal(sensors.state.light,'on');
  native.illuminance=99;native.dispatchEvent(new Event('reading'));assert.deepEqual(readings,[[.5,99]]);
  native.illuminance=NaN;native.dispatchEvent(new Event('reading'));assert.equal(readings.length,1);
  document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(sensors.state.light,'paused');assert.equal(native.stopped,true);
  native.illuminance=20;native.dispatchEvent(new Event('reading'));assert.equal(readings.length,1);
});

test('el permiso denegado del sensor de luz no deja el dispositivo activo',async()=>{
  let native;
  class AmbientLightSensor extends EventTarget {
    constructor(){super();native=this;}
    start(){}
    stop(){this.stopped=true;}
  }
  const statuses=[],sensors=new EnvironmentSensors({status:(...args)=>statuses.push(args)},{AmbientLightSensor,isSecureContext:true});
  await sensors.light();const event=new Event('error');event.error={name:'NotAllowedError'};native.dispatchEvent(event);
  assert.equal(sensors.state.light,'error');assert.equal(native.stopped,true);assert.match(statuses.at(-1)[2],/denegado/);
});
