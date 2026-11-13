# La Finca del Valle · concepto interactivo con fotos vivas

Concepto de rediseño **no oficial** para [La Finca del Valle](https://www.lafincadelvalle.com/), tres casas rurales de diseño en el Valle de Vegacervera (León). Es una web de una sola página hecha con **las fotos reales de la casa, animadas en WebGL**. Cada foto tiene un mapa de profundidad generado con IA, así que la cámara se mueve en 3D por dentro de la imagen. Encima se añaden nubes, niebla, nieve, luces que titilan y el paso del atardecer a la noche.

Los textos, datos y fotografías salen de la web real. La página lleva `noindex` y un `robots.txt` que bloquea a los buscadores, para no competir con la web oficial.

## Arrancar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # genera dist/
npm run preview   # sirve dist/ en http://localhost:4173
```

## Qué hay dentro

| Sección | Qué hace |
| --- | --- |
| **Hero** | Foto aérea real al atardecer con profundidad 3D (sigue al ratón y al giroscopio). Un control pasa del atardecer a la noche: el valle se apaga, salen las estrellas y quedan encendidas las cristaleras. Al bajar, la cámara se acerca a las casas. |
| **Nuestra historia** | Manuel y Valeria, con polaroids animadas y cifras que cuentan. |
| **Un día en la finca** | Seis fotos reales encadenadas con el scroll: amanecer con niebla, otoño, vista aérea, el camino a la hora dorada, la fachada y la noche. Cada foto tiene su movimiento de cámara y cambia a la siguiente con un revelado que va de lejos a cerca. |
| **Las casas** | La foto real de la fachada. Al pasar por una cristalera (Maelo, Braña o Teleno) se ilumina esa casa y el resto se atenúa. Al tocarla se abre su ficha con galería, datos y precio. |
| **Entorno** | Mapa 3D con el relieve real del valle (unos 45 × 31 km, con el sol y la bruma) y las 10 rutas GPX de la web oficial. Al elegir un lugar, la cámara vuela hasta él y se dibuja el camino desde la casa. Los ríos salen del propio relieve. León y Riaño, que quedan fuera, se señalan en el borde. Arrastrar gira el mapa y Ctrl + rueda acerca; en móvil se usan dos dedos y la página sigue haciendo scroll con uno. |
| **Estaciones** | Panel vivo con el mismo encuadre en otoño y nevando: copos en tres capas de profundidad y niebla. Debajo, una tira de fotos de dron que se arrastra, con visor a pantalla completa. |
| **Opiniones** | Reseñas reales de Google y Booking.com como notas pegadas. |
| **Reservar** | Selector de casa, calendario de rango y huéspedes, con una estimación por el precio «desde». Desde ahí se va al motor de reservas o se abre WhatsApp o un email con el mensaje ya escrito. |

Está en español e inglés, con el idioma recordado en el navegador. Con `prefers-reduced-motion` se quitan el scroll suave, el parallax y las animaciones, y todo el contenido sigue visible.

Hay protecciones de rendimiento:

- En equipos sin GPU real (render por software) se muestran las fotos fijas.
- La resolución del lienzo baja sola si el dispositivo no llega a la tasa de fotogramas.
- La animación empieza cuando la página ya ha cargado, y cada escena se prepara solo al acercarse.

Para forzar WebGL en pruebas: `?gl=force`.

**Ajustes de intensidad:** con `?ajustes` en la URL aparece un panel con deslizadores para el movimiento 3D, la noche, la nieve, la niebla, las nubes y el halo de las luces. Los cambios se ven en directo y se recuerdan en ese navegador. «Copiar valores» deja los números listos para fijarlos en `src/live/tuning.ts`.

## Stack

- Vite + TypeScript, sin framework.
- WebGL2 con un shader propio (`src/live/`): parallax por profundidad, *dolly* de cámara, nubes por campo de flujo, niebla fbm, nieve procedural, paso a la noche y transiciones.
- Three.js para el mapa 3D (`src/map3d/`), que se carga aparte solo al llegar a esa sección.
- Datos de elevación públicos (Terrain Tiles de AWS Open Data / Mapzen), procesados con `tools/terrain.py`: altura en 16 bits, textura pintada (prado, bosque, roca caliza y ríos calculados por escorrentía) y rutas GPX.
- Depth Anything V2 (ONNX), solo en preparación: `tools/depth.py` genera para cada foto una textura con profundidad (R), cielo (G) y luces (B).
- GSAP + ScrollTrigger para las animaciones ligadas al scroll, y Lenis para el scroll suave.
- Fraunces y Figtree autoalojadas con Fontsource: sin Google Fonts, lo que también evita problemas de RGPD.

## Estructura

```
src/
  content.ts          contenido real (ES/EN): casas, momentos, lugares, reseñas, FAQ
  i18n.ts             idioma
  live/shader.ts      shader de foto viva
  live/livephoto.ts   motor WebGL (texturas, puntero, calidad adaptativa, sin GPU → foto fija)
  live/scenes.ts      ajustes de cada foto y zonas de las casas
  live/tuning.ts      multiplicadores de intensidad y panel ?ajustes
  map3d/terrain.ts    mapa 3D: relieve, luz, rutas, vuelos de cámara
  time.ts             hora de Vegacervera
  sections/*.ts       hero, día, casas, mapa, galería/opiniones, reserva
  styles/main.css     diseño
public/photos/        fotos descargadas de la web oficial
public/live/          fotos animables + mapas de profundidad/cielo/luces
tools/depth.py        generador de esos mapas
public/terrain/       relieve (height.png), textura (color.webp) y rutas (meta.json)
tools/terrain.py      generador del mapa 3D
```

## Lighthouse (móvil, build de producción)

| Rendimiento | Accesibilidad | Buenas prácticas | SEO |
| --- | --- | --- | --- |
| ≈83 | 100 | 100 | — |

Lighthouse mide sin GPU, así que ahí se ve la versión de fotos fijas. La puntuación de SEO sale baja a propósito, por el `noindex`. Para producción bastaría con quitar el `noindex` y el `robots.txt`.
