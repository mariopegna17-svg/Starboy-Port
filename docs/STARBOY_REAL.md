# Cómo es y cómo funciona el Starboy original

Investigación realizada el 14 de octubre de 2026. Las especificaciones de la web son afirmaciones de CREATURE; no constituyen mediciones independientes de un dispositivo. La grabación aportada permite comprobar su apariencia y el nacimiento. El código público permite comprobar la demostración web de los ojos, no la lógica del firmware.

## Fuentes consultadas

- **[Producto oficial](https://hesjustalittleguy.com/):** descripción del comportamiento, sensores, encuentros, autonomía y fichas de materiales. Las fichas de producto se generan con `productData` dentro del HTML; leer únicamente el texto inicial de la página omite sus especificaciones.
- **[Catálogo oficial de ojos](https://creature.company/eyes):** formas, colores y probabilidades mostradas por la demostración.
- **[Código del catálogo](https://creature.company/eyes/eyes_grid.min.js?v=da13d59797), [animaciones de la web](https://hesjustalittleguy.com/animation_renderer_web.js) y [widget de ojos](https://hesjustalittleguy.com/eye_widget.js):** comportamiento verificable del escaparate web.
- **[Vídeo de nacimiento de @lilguynet](https://www.tiktok.com/@lilguynet/video/7659459357876276511):** vídeo aportado por el usuario y metadatos públicos de TikTok. El perfil está enlazado desde la web oficial.
- **[Metadatos oficiales del vídeo](https://www.tiktok.com/oembed?url=https://www.tiktok.com/@lilguynet/video/7659459357876276511):** título y autor, recuperados durante esta investigación. Título literal: “Spawn animation! Your first interaction with STARBOY. Plays once and never again”.
- **[Imagen oficial del aparato](https://hesjustalittleguy.com/img/starboy/render_stainless-1024.webp)** y **[vídeo de presentación](https://hesjustalittleguy.com/img/starboy/preview.mp4)**: referencias de aspecto. El vídeo de presentación es promocional; no sirve para deducir reacciones a gestos.

No se consiguió consultar el kit de prensa de Dropbox ni resultados de buscadores en este entorno: las peticiones devolvieron 403. El perfil de TikTok y el vídeo sí respondieron; el listado público de publicaciones no entregó datos. Esta investigación no presenta otros vídeos, reseñas ni un manual completo como si se hubieran revisado.

## Aparato físico

Starboy es una mascota digital portátil de CREATURE. Tiene cuerpo de estrella, pantalla circular negra con dos ojos, una cámara frontal visible en una de las puntas y una anilla que permite llevarlo colgado. El vídeo aportado muestra un aparato sostenido en la mano, conectado por cable; las imágenes de producto permiten comprobar el cuerpo y la posición de la cámara.

Las fichas oficiales anuncian:

- Pantalla **OLED de 400 × 400**. La ficha da la resolución, no un tamaño físico ni una frecuencia de actualización.
- Cámara, micrófono y acelerómetro. La descripción general añade expresamente **sensor de temperatura**.
- Respuesta háptica.
- **Más de 24 horas de batería**, anunciadas por el fabricante, y carga **USB-C**.
- Variantes de aluminio pintado o anodizado, acero inoxidable 316L, latón y acrílico óptico endurecido; las fichas muestran una anilla de acero inoxidable 316L.

“Starboy Egg” aparece como un estuche con cuerpo de aluminio e inserto de silicona. La ficha no acredita que sea un segundo dispositivo con funciones de mascota.

CREATURE describe Starboy como un dispositivo autónomo y dice que no se conecta al teléfono ni a internet. La tecnología con la que se comunican dos Starboys no se especifica en las fuentes consultadas: no hay base para afirmar que utilicen Bluetooth, infrarrojos o Wi-Fi.

## Comportamientos confirmados por CREATURE

| Estímulo o situación | Respuesta descrita por el fabricante |
| --- | --- |
| Ambiente ruidoso | Se pone ansioso. |
| Frío | Tiembla. |
| Sacudirlo | Se marea y se enfada contigo. |
| Mostrar el pulgar arriba | Permite comprobar el nivel de batería. |
| Mostrar el dedo medio | Se pone triste. |
| Encontrarse con otro Starboy | Se comunican, intercambian ojos, transmiten comportamientos y juegan. |

Texto literal de la web: “give him a thumbs up to check the battery level, or flick him off if you feel like making him sad.” El pulgar arriba consulta batería del aparato; no describe un medidor de energía de la mascota.

Cada unidad se entrega con una personalidad distinta y unos ojos propios. CREATURE anuncia “over 400 looks, each with associated rarity”. La web también dice “They swap eyes, spread behaviors, and play with each other.” Esto respalda los encuentros y la transmisión de comportamientos, pero no explica su protocolo, duración, reglas de aprendizaje ni animaciones exactas.

La presencia de una cámara y estas dos respuestas gestuales están documentadas. No se encontró una lista completa de gestos, una especificación del seguimiento de cabeza ni una demostración verificable de caricias, besos, aplausos o corazones con las manos. Esto queda pendiente de comprobar; no significa que el aparato carezca de esas funciones.

## Ojos y movimiento

El catálogo web consultado contiene **100 paletas y cuatro formas**: `dot` (punto), `circle` (círculo), `cat` (gato) y `acorn` (bellota). Son 400 combinaciones en esa demostración; la publicidad general habla de más de 400 apariencias. No se ha verificado cómo se relacionan todas las posibles apariencias del firmware con este catálogo.

El código del catálogo calcula probabilidades distintas para paletas y formas. Para las formas, la demostración utiliza punto 10 %, círculo 40 %, gato 30 % y bellota 20 %. Son datos del catálogo público; no se ha comprobado que constituyan las probabilidades de fabricación o nacimiento del aparato físico.

La demostración usa `animation_renderer.js`, `animation_renderer.wasm` y `anim_data.bin`. El motor genera contornos de curvas y colores, no únicamente imágenes estáticas. La web activa cuatro identificadores de animación al iniciar y después dispara animaciones aleatorias de dos grupos: tres identificadores cada 3–6 segundos y seis identificadores cada 5–10 segundos. Son grupos e intervalos comprobados en la web, no mediciones del firmware ni una clasificación oficial de sus emociones.

En la web de presentación, los ojos siguen el ratón con suavizado y diferentes tiempos de respuesta entre instancias; el seguimiento se desactiva para punteros táctiles. Esto no prueba qué algoritmo utiliza la cámara del dispositivo ni cómo sigue una cabeza.

Los identificadores de animación están ofuscados. No permiten atribuir una expresión concreta a “amor”, “hambre” o “tristeza” sin observarla y contrastarla con una demostración física. Disponer de los recursos públicos del dibujo no equivale a disponer del firmware. [Procedencia de los recursos incluidos en el port](../public/vendor/starboy/PROVENANCE.md).

## Primer encendido

El título oficial del vídeo confirma que el nacimiento es la primera interacción y **se reproduce una sola vez**. Esto sí coincide con la petición del usuario.

El archivo aportado dura aproximadamente **50,5 segundos**. En él se observa un punto oscuro sobre una superficie rosa, una transición a negro, una figura luminosa que crece y se divide, párpados y varias apariencias de ojos con destellos. Al final aparecen ojos amarillos con una pupila verde y otra azul. Es una referencia concreta de una unidad; no prueba que todas las unidades terminen con esos colores ni que cada nacimiento dure exactamente lo mismo que la grabación.

El port reproduce un trazado de esa grabación y guarda la finalización en el navegador. No se ha extraído la secuencia del firmware. La persistencia real del aparato y la persistencia del navegador son mecanismos distintos. [Detalles de la reconstrucción](../public/boot/PROVENANCE.md).

## Relación con esta adaptación

| Función del port | Relación con el original y límite de fidelidad |
| --- | --- |
| Motor y catálogo de ojos | Recursos públicos originales; el controlador de la mascota es propio. |
| Nacimiento una sola vez | Comportamiento confirmado; reproducción reconstruida desde el vídeo. |
| Ruido, frío y sacudidas | Estímulos confirmados; umbrales, tiempos y reacciones gráficas del port son propios. |
| Pulgar arriba y dedo medio | Acciones confirmadas. Safari no ofrece la batería del iPhone: el port muestra energía de mascota como alternativa identificada. |
| Personalidad | El original tiene personalidades distintas; los cuatro tipos, valores, evolución y recuerdos del port se diseñaron para la adaptación. |
| Intercambio de ojos y aprendizaje en encuentros | Conceptos confirmados. Salas, mensajes, reglas y portal del port son una implementación propia mediante internet. |
| Entrar en el universo de otra mascota | Función solicitada para el port; no está acreditada como función del aparato original. |
| Hambre, alimentación, vínculo y juego de cinco estrellas | Mecánicas creadas para el port; no se han verificado en el aparato. |
| 44 gestos y seguimiento de cabeza | Ampliación solicitada para el port. El catálogo completo de respuestas del original sigue sin verificarse. |
| Cariño con rubor, inclinación y corazones | Diseño de esta adaptación. El parpadeo usa el motor público; la secuencia de cariño no se ha contrastado con el aparato. |
| Nuevos saltos, cabeceos, sueño y animaciones de cuidados | Secuencias añadidas al controlador web; no son una extracción de la lógica física. |
| Temperatura real | El aparato tiene su sensor. Safari no expone temperatura ambiente: el port necesita un termómetro externo compatible en un navegador con Web Bluetooth, o entrada manual identificada. |
| Háptica, autonomía y carga | Características físicas del original; la app depende del iPhone y de las APIs que permita su navegador. |

## Criterios para mejorar la fidelidad

Conservar la geometría, las paletas, los párpados y las expresiones del motor público. Comprobar visualmente los identificadores nativos antes de asignarles emociones. Tomar ruido, frío, sacudidas, pulgar arriba, dedo medio y encuentros como base confirmada del comportamiento.

Para reproducir exactamente el cariño, el seguimiento de cabeza, el enfado y los encuentros hacen falta demostraciones físicas de esas interacciones o documentación del fabricante. Los tiempos del escaparate web y las animaciones creadas para el port no deben presentarse como especificaciones del aparato. Las ampliaciones solicitadas pueden coexistir con esta referencia sin atribuirlas a CREATURE.
