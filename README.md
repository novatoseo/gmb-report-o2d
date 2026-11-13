# La Finca del Valle · concepto interactivo: un viaje 3D por el valle

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
| **El viaje (3D)** | Una sola escena WebGL que el scroll recorre en 4 momentos, todo en la hora azul. **I · El valle:** sobre las nubes y descenso por el relieve real. **II · Las casas:** se atraviesan las fotos reales en 3D y el foco recorre Maelo, Braña y Teleno con su etiqueta pegada a la cristalera. **III · Desde la puerta:** la ruta GPX del Faedo de Ciñera se dibuja sola. **IV · El silencio:** nieva, las casas encendidas y el valle se deshace en puntos de luz. Los titulares están dentro de la escena como texto SDF (troika-three-text); los de la página siguen ahí, ocultos a la vista, para lectores de pantalla y traducción. Un HUD muestra la latitud, la longitud y la altitud reales de la cámara. |
| **Capa Igloo** | Precarga a pantalla completa con contador, postproceso (bloom, aberración cromática que crece con la velocidad del scroll, viñeta y grano) y un fluido que deforma la imagen al mover el puntero. También: la cámara abre el ángulo al hacer scroll rápido, los títulos se «decodifican» letra a letra, un sonido ambiente generado en el navegador (viento según la altitud, pájaros de día, grillos de noche, todo amortiguado con la nieve), un cursor acompañante, las esquinas del encuadre y el menú reducido durante el viaje. |
| **Nuestra historia** | Manuel y Valeria, con polaroids animadas y cifras que cuentan. |
| **Las casas** | Tarjetas de Maelo, Braña y Teleno, y la ficha de cada una con galería, datos y precio. |
| **Entorno** | Mapa 3D con el relieve real del valle (unos 45 × 31 km, con el sol y la bruma) y las 10 rutas GPX de la web oficial. Al elegir un lugar, la cámara vuela hasta él y se dibuja el camino desde la casa. Los ríos salen del propio relieve. León y Riaño, que quedan fuera, se señalan en el borde. Arrastrar gira el mapa y Ctrl + rueda acerca; en móvil se usan dos dedos y la página sigue haciendo scroll con uno. |
| **Estaciones** | Tira de fotos de dron (otoño e invierno) que se arrastra, con visor a pantalla completa. |
| **Opiniones** | Reseñas reales de Google y Booking.com como notas pegadas. |
| **Reservar** | Selector de casa, calendario de rango y huéspedes, con una estimación por el precio «desde». Desde ahí se va al motor de reservas o se abre WhatsApp o un email con el mensaje ya escrito. |

Está en español e inglés, con el idioma recordado en el navegador. Con `prefers-reduced-motion` se quitan el scroll suave, el parallax y las animaciones, y todo el contenido sigue visible.

Hay protecciones de rendimiento:

- En equipos sin GPU real (render por software), y con movimiento reducido, el viaje se muestra como una secuencia de fotos con sus textos.
- Three.js y los datos del relieve se descargan aparte, y el viaje solo se pinta mientras está en pantalla.

Para forzar WebGL en pruebas: `?gl=force`.

**Ajustes de intensidad:** con `?ajustes` en la URL aparece un panel con deslizadores para el movimiento 3D, la noche, la nieve, la niebla, las nubes y el halo de las luces. Los cambios se ven en directo y se recuerdan en ese navegador. «Copiar valores» deja los números listos para fijarlos en `src/live/tuning.ts`.

## Stack

- Vite + TypeScript, sin framework.
- Three.js para el viaje y el mapa (se cargan aparte). Shaders propios para el terreno (sol, nieve que baja de cota), el cielo (amanecer, estrellas), las fotos 3D (desplazadas con su mapa de profundidad y con un quemado al atravesarlas) y la nieve en el aire.
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
  journey/journey.ts  el viaje: cámara, luz, nubes, fotos 3D, ruta, nieve y noche
  journey/shaders.ts  terreno con nieve, cielo con estrellas, fotos 3D con quemado
  journey/titles.ts   titulares 3D (SDF) y etiquetas de las casas
  three/terrainData.ts relieve real compartido por el viaje y el mapa
  sections/journey.ts capítulos, HUD y versión en fotos
  live/scenes.ts      zonas de las casas en la foto de la fachada
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
