# Starboy Port

Una mascota digital para iPhone en horizontal, inspirada en [Starboy de CREATURE](https://hesjustalittleguy.com/). Usa el motor público original para los ojos y añade una vida persistente, cuidados, sensores del navegador y encuentros entre mascotas. Es una adaptación web independiente; no contiene el firmware del dispositivo.

## Funciones

- **400 estilos de ojos:** 100 paletas originales × punto, círculo, gato y bellota. Catálogo con búsqueda, rarezas, descubrimientos y selección aleatoria ponderada.
- **Personalidad y vida persistente:** curioso, tímido, juguetón o soñador; energía, saciedad, felicidad, vínculo y recuerdos. El estado se conserva en este navegador y evoluciona al volver. Exportación e importación de la mascota en JSON.
- **Cuidados:** alimentar, acariciar, dormir, despertar, calmar y jugar a atrapar cinco estrellas.
- **Reacciones:** felicidad, cariño, sueño, hambre, ansiedad, frío, calor, mareo y tristeza, con miradas, parpadeos, expresiones y partículas.
- **Cámara:** reconocimiento local de pulgar arriba, palma abierta, victoria, puño, pulgar abajo y dedo medio. La mano dirige la mirada; poca luz provoca sueño. No se envían imágenes al servidor.
- **Micrófono:** medición local de volumen; el ruido pone nerviosa a la mascota. No se graba ni se envía audio.
- **Movimiento:** inclinación para dirigir la mirada y sacudidas para marearla, con solicitud de permiso en iOS.
- **Encuentros:** salas WebSocket para hasta ocho mascotas. Descubren los ojos de otras, se saludan, juegan, aprenden comportamientos de sus amigos y pueden intercambiar ojos. El intercambio va dirigido al primer amigo de la sala.
- **PWA:** instalación en pantalla de inicio, modo inmersivo, márgenes seguros del iPhone y funcionamiento sin conexión después de la primera carga.

## Límites de la adaptación

El control de primer encendido guarda una marca independiente de la mascota y solo la completa cuando termina la reproducción; recargar, importar o crear otra mascota no borra esa marca. El controlador está preparado en `public/js/first-boot.js`. La bienvenida conserva su estado al cerrar y volver, incluso si hubo un autoguardado antes de pulsar «Conocer a mi Starboy».

La animación del primer encendido del aparato físico **todavía no está integrada**. La referencia aportada es [este vídeo de @lilguynet](https://www.tiktok.com/@lilguynet/video/7659459357876276511). El proxy del entorno devuelve HTTP 403 al conectar con TikTok, por lo que su secuencia aún no se ha podido examinar. `www.tiktok.com` está añadido al borrador de configuración de red; guardar y publicar ese cambio permite volver a comprobar el acceso. Cuando se pueda revisar el vídeo, hay que implementar su secuencia y conectar el reproductor a `firstBoot.play()`, resolviendo `true` únicamente al terminar. Hasta entonces, la app conserva pendiente la marca de primer encendido.

Safari no proporciona temperatura ambiente ni nivel de batería del iPhone: la temperatura tiene un control **simulado** y el pulgar arriba muestra la **energía de la mascota**. En navegadores con Battery Status API se muestra la batería real del dispositivo. La vibración y el bloqueo de orientación dependen del navegador; no se finge su disponibilidad. En iPhone puede ser necesario desactivar el bloqueo de orientación y añadir la app a la pantalla de inicio.

Los encuentros requieren una sala compartida y conexión a internet; no detectan dispositivos próximos automáticamente. Las salas son temporales y desaparecen al desconectar o reiniciar el servidor. No hay cuentas ni sincronización en la nube: cambiar de navegador o borrar sus datos requiere una copia exportada. Los gestos sin cámara están disponibles como controles manuales. El reconocimiento de gestos sin conexión requiere haberlo activado una vez para guardar modelo y runtime.

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
5. Gira el iPhone, añade la app a pantalla de inicio y activa los sensores que quieras.

El plan gratuito puede suspender el servicio cuando no se utiliza: despertar el servidor puede tardar y las salas se reinician. Los cuidados y ojos instalados siguen funcionando sin conexión.

## Validación

```sh
npm test
npm run test:browser
```

Las pruebas de Node verifican persistencia, cuidados, catálogo y salas WebSocket reales. Las de navegador cubren un viewport táctil de iPhone horizontal, todos los estilos, orientación, PWA sin conexión, permisos separados, reconocimiento con imágenes reales de referencia e intercambio entre dos navegadores. Usa el Chromium del sistema si existe; en otras máquinas ejecuta `npx playwright install chromium`. Un viewport móvil de Chromium no sustituye una prueba física en Safari.

## Procedencia

- `public/vendor/starboy/animation_renderer.js`, `.wasm` y `anim_data.bin`: recursos públicos de `https://creature.company/`, consultados el 11 de octubre de 2026. Se conservan sin modificar. Las formas, paletas, identificadores de animación y pesos de rareza proceden de su demostración de ojos. [Inventario y sumas](public/vendor/starboy/PROVENANCE.md).
- Reconocimiento: `@mediapipe/tasks-vision` de Google y modelo oficial versionado de MediaPipe. El modelo se descarga durante el build; no se guarda en Git.
- `tests/fixtures`: imágenes públicas de referencia de MediaPipe, usadas solo en pruebas.
- Interfaz, lógica de cuidados, persistencia, servidor, encuentros y adaptación para iPhone: implementación de este port. Las capacidades del firmware original no están reproducidas ni comprobadas por esta app.
