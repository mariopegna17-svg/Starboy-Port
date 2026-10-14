# Starboy Port

Una mascota digital para iPhone en horizontal, inspirada en [Starboy de CREATURE](https://hesjustalittleguy.com/). Usa el motor público original para los ojos y añade una vida persistente, cuidados, sensores del navegador y encuentros entre mascotas. Es una adaptación web independiente; no contiene el firmware del dispositivo.

## Funciones

- **400 estilos de ojos:** 100 paletas originales × punto, círculo, gato y bellota. Catálogo con búsqueda, rarezas, descubrimientos y selección aleatoria ponderada.
- **Personalidad y vida persistente:** curioso, tímido, juguetón o soñador; energía, saciedad, felicidad, vínculo y recuerdos. El estado se conserva en este navegador y evoluciona al volver. Exportación e importación de la mascota en JSON.
- **Cuidados:** alimentar, acariciar, dormir, despertar, calmar y jugar a atrapar cinco estrellas.
- **Reacciones:** felicidad, cariño, sueño, hambre, ansiedad, frío, calor, mareo y tristeza, con miradas, parpadeos, expresiones y partículas.
- **Vida animada:** miradas espontáneas, curiosidad, pequeños saltos, timidez y cabeceos según su personalidad y ánimo. Comer, jugar, saludar, descubrir ojos, dormir y despertar tienen secuencias propias; durante el juego sigue las estrellas y celebra al terminar. También acepta caricias arrastrando el dedo. Los cambios de emoción son suaves y las visitas se miran entre sí.
- **Cámara:** 44 poses, expresiones y movimientos reconocibles, con captura invisible y procesamiento local. Incluye tres y cuatro dedos, meñique, cuernos, llamada, saludo vulcano, dedos cruzados, señalar y deslizar en cuatro direcciones. Reconoce corazón con ambas manos, dos pulgares, dos victorias, dos palmas, juntar puños y aplaudir; también sonrisas, besos, guiños, cejas, boca, mejillas y movimientos de cabeza. El rostro dirige la mirada y tiene prioridad sobre la mano. «Ambiente → Ver los gestos de cámara» explica las reacciones y muestra el último gesto detectado. Los gestos sostenidos reaccionan una sola vez y el reconocimiento usa un Worker cuando el navegador lo permite. No se envían imágenes al servidor.
- **Micrófono:** medición local de volumen; el ruido pone nerviosa a la mascota. No se graba ni se envía audio.
- **Movimiento:** inclinación para dirigir la mirada y sacudidas para marearla, con solicitud de permiso en iOS.
- **Encuentros:** salas WebSocket para hasta ocho mascotas. Descubren los ojos de otras, se saludan, juegan, aprenden comportamientos de sus amigos y pueden intercambiar ojos. El intercambio va dirigido al primer amigo de la sala. «Entrar en su universo» abre un portal: ambas mascotas aparecen juntas, animadas, con caricias, comida y juego compartidos. Cada mascota participa en una visita; el anfitrión puede despedirla y desconectar cierra el portal sin sustituir las identidades guardadas.
- **PWA:** instalación en pantalla de inicio, modo inmersivo, márgenes seguros del iPhone y funcionamiento sin conexión después de la primera carga.
- **Primer encendido:** reconstrucción de los 50,5 segundos del vídeo del dispositivo físico, con el punto sobre fondo rosa, nacimiento luminoso y aparición de los ojos. Se reproduce una sola vez por navegador y origen; la marca se guarda al terminar.

## Límites de la adaptación

El primer encendido es una reconstrucción Canvas trazada desde [el vídeo aportado de @lilguynet](https://www.tiktok.com/@lilguynet/video/7659459357876276511), no una extracción del firmware: conserva la secuencia y los tiempos del archivo de referencia, con las limitaciones de detalle y color de una grabación de cámara. [Procedencia y reproducción del trazado](public/boot/PROVENANCE.md).

El control guarda una marca independiente de la mascota al terminar la animación. Recargar, importar o crear otra mascota no borra esa marca; borrar los datos del sitio o cambiar de navegador permite otro primer encendido. Si cierras antes de terminar, se vuelve a intentar al abrir. La reproducción se pausa al ocultar la página o mostrar el aviso de orientación, y sus trazos se guardan con la PWA para funcionar sin conexión. La bienvenida aparece después y conserva su estado si cierras antes de pulsar «Conocer a mi Starboy». Los contornos se interpolan entre fotogramas; los párpados finos y los ojos amarillos finales se reconstruyen con curvas limpias. En Ajustes, «Ver animación de encendido» permite repetirla manualmente sin borrar la mascota ni cambiar la marca del primer encendido.

Safari no proporciona temperatura ambiente ni nivel de batería del iPhone: el control de temperatura es **manual**. En navegadores con Web Bluetooth se puede conectar un termómetro real que publique Environmental Sensing (`0x181a`) y Temperature (`0x2a6e`), con lecturas y notificaciones en °C; Safari no permite esa conexión. El sensor nativo de luz entrega lux si el navegador y el dispositivo lo ofrecen. Los controles muestran su disponibilidad y la fuente de la medida. El pulgar arriba muestra la **energía de la mascota**. En navegadores con Battery Status API se muestra la batería real del dispositivo. La vibración y el bloqueo de orientación dependen del navegador; no se finge su disponibilidad. En iPhone puede ser necesario desactivar el bloqueo de orientación y añadir la app a la pantalla de inicio.

Los encuentros requieren una sala compartida y conexión a internet; no detectan dispositivos próximos automáticamente. Las salas son temporales y desaparecen al desconectar o reiniciar el servidor. No hay cuentas ni sincronización en la nube: cambiar de navegador o borrar sus datos requiere una copia exportada. Los gestos sin cámara están disponibles como controles manuales. El reconocimiento de gestos sin conexión requiere haberlo activado una vez para guardar modelo y runtime. Esos recursos se conservan al actualizar la app. La cámara se activa y apaga desde Ambiente. Mantén las poses un instante y relájalas para repetirlas; las manos deben permanecer en el encuadre y los gestos de cabeza necesitan movimientos deliberados. Las poses adicionales usan la geometría de los puntos de mano y las expresiones del modelo facial; la precisión depende del encuadre y la iluminación. Al salir de la app, los sensores se pausan y liberan sus pistas; al volver, toca «Reanudar» en Ambiente. La alternativa para navegadores sin Worker reduce la frecuencia de análisis.

Las caricias, sonrisas y besos usan un parpadeo del motor original, una inclinación suave y rubor difuminado. Dos corazones pequeños aparecen a los lados y se desvanecen; repetir una caricia prolonga el gesto sin acumular corazones. Saludo, comida, calma y juego tienen animaciones propias. Con movimiento reducido, el cariño se limita a un corazón estático que se desvanece.

Los gestos espontáneos conservan las formas y paletas originales: desplazan, inclinan o escalan ambos ojos juntos. La mirada de cámara, movimiento o dedo tiene prioridad sobre las miradas espontáneas; los cuidados interrumpen los gestos de reposo. Estos gestos se detienen en menús, durante el primer encendido, al ocultar la app y con movimiento reducido. Dormir mantiene los párpados originales cerrados y despertar vuelve a abrirlos; el motor de reserva también tiene párpados curvos. Las animaciones de reposo no añaden recuerdos ni cambian el vínculo o la personalidad guardada.

## Desarrollo

Requiere Node.js 22 o posterior. Cada tarea de Codex tiene su propio entorno aislado; usa este checkout, sin crear un Git worktree adicional.

```sh
cd /workspace/Starboy-Port
npm ci
npm run model
npm run build
npm run dev
```

El servidor usa `PORT` (por defecto 3000), escucha en `0.0.0.0` y ofrece `GET /healthz`. El cliente se sirve directamente, sin bundler. Cámara y micrófono necesitan HTTPS o un origen local de desarrollo. Nunca añadas claves a archivos públicos.

En el entorno cloud, usa una caché escribible y el proxy de Node si la red lo necesita:

```sh
npm --cache /tmp/starboy-npm-cache ci
NODE_USE_ENV_PROXY=1 npm run model
```

`NODE_USE_ENV_PROXY` requiere una versión de Node que lo admita (el entorno probado usa Node 24.19). Render no necesita esta opción. La descarga del modelo preserva TLS y verifica su SHA-256; un modelo modificado provoca un error de instalación.

## Desplegar en Render

1. Sube este proyecto a GitHub.
2. En Render elige **New → Blueprint** y conecta el repositorio. `render.yaml` define el servicio, la instalación, el modelo, el inicio y el healthcheck.
3. Alternativamente, crea un **Web Service** de Node con:
   - Build: `npm ci --omit=dev && npm run model && npm run build`
   - Start: `npm start`
   - Healthcheck: `/healthz`
4. Abre la URL HTTPS que Render asigne en Safari. No necesitas secretos ni una base de datos.
5. Gira el iPhone, añade la app a pantalla de inicio y activa los sensores que quieras. El icono para iPhone se sirve en `apple-touch-icon.png` (180 × 180); Android usa un icono separado con márgenes de recorte seguros. Si ya existía un acceso con un icono antiguo, vuelve a añadirlo desde Safari.

El plan gratuito puede suspender el servicio cuando no se utiliza: despertar el servidor puede tardar y las salas se reinician. Los cuidados y ojos instalados siguen funcionando sin conexión.

## Validación

```sh
npm test
npm run test:browser
```

Las pruebas de Node verifican persistencia, cuidados, catálogo y salas WebSocket reales. Las de navegador cubren la reproducción completa del primer encendido, persistencia al recargar/importar/reiniciar, interrupciones, pausa por orientación o visibilidad y relevo entre pestañas, además de un viewport táctil de iPhone horizontal, todos los estilos, PWA sin conexión, permisos separados, cancelación durante la solicitud, denegación e interrupción de cámara, retorno del segundo plano, reconocimiento tras recargar sin conexión, alternativa sin Worker, recuperación de los ojos, icono de iPhone, reconocimiento con imágenes reales de referencia e intercambio entre dos navegadores. Usa el Chromium del sistema si existe; en otras máquinas ejecuta `npx playwright install chromium`. Un viewport móvil de Chromium no sustituye una prueba física en Safari.

## Procedencia

- `public/vendor/starboy/animation_renderer.js`, `.wasm` y `anim_data.bin`: recursos públicos de `https://creature.company/`, consultados el 11 de octubre de 2026. Se conservan sin modificar. Las formas, paletas, identificadores de animación y pesos de rareza proceden de su demostración de ojos. [Inventario y sumas](public/vendor/starboy/PROVENANCE.md).
- Reconocimiento: `@mediapipe/tasks-vision` de Google y modelos oficiales versionados GestureRecognizer y FaceLandmarker. Se descargan durante el build y se verifican por SHA-256; no se guardan en Git.
- `tests/fixtures`: imágenes públicas de referencia de MediaPipe, usadas solo en pruebas.
- Interfaz, lógica de cuidados, persistencia, servidor, encuentros y adaptación para iPhone: implementación de este port. Las capacidades del firmware original no están reproducidas ni comprobadas por esta app.
