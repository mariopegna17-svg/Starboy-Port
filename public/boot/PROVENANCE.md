# Referencia del primer encendido

- Autor de la grabación: **@lilguynet**.
- Referencia: https://www.tiktok.com/@lilguynet/video/7659459357876276511
- Archivo aportado por el usuario: `lilguynet_video_watermark.mp4`, 576 × 1024, 30 fps.
- SHA-256 del archivo: `9069ee36e57f0a29ec0469baedf7d82e94c34f24df0118a8bebd9e5a4a0bacc3`.
- Vídeo analizado: 1515 fotogramas, **50,5 segundos**. No se incluye la grabación en el cliente.

`sequence.json` contiene contornos vectoriales de la pantalla iluminada, normalizados a 400 × 400: punto sobre rosa, transición a negro, figura luminosa que crece y se divide, y secuencia de ojos. Se conserva el orden y tiempo de los fotogramas. El reproductor Canvas suaviza los contornos y dibuja únicamente la animación dentro de la pantalla circular. No reproduce el audio ambiental de la grabación.

Es una reconstrucción de una referencia filmada, no el recurso original del firmware. La posición del aparato se estabiliza, se descartan reflejos oscuros y se cuantizan los colores; la resolución, compresión y perspectiva de la cámara limitan la fidelidad de los detalles.

Para regenerar el recurso, con Python, NumPy y OpenCV disponibles:

```sh
python scripts/trace-boot.py /ruta/lilguynet_video_watermark.mp4 public/boot/sequence.json
```

El trazado se preparó con `opencv-python-headless==5.0.0.93`. OpenCV es una herramienta de desarrollo; Render y la aplicación no lo necesitan. `npm run build` comprueba que el recurso conserve todos los fotogramas, tiempos y contornos válidos.
