# La Finca del Valle · concepto ilustrado e interactivo

Concepto de rediseño **no oficial** para [La Finca del Valle](https://www.lafincadelvalle.com/), tres casas rurales de diseño en el Valle de Vegacervera (León). Es una web de una sola página, ilustrada a mano en SVG, donde el valle cambia con la hora del día.

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
| **Hero** | Valle ilustrado con parallax (ratón y giroscopio). Sigue la hora real de Vegacervera. Un dial deja mover el sol o ver un día entero en 14 s. Las ovejas saltan si las tocas. |
| **Nuestra historia** | Manuel y Valeria, con polaroids animadas y cifras que cuentan. |
| **Un día en la finca** | Escena fija mientras haces scroll: el sol avanza de 05:24 a 23:36 y aparecen seis momentos reales (amanecer, Faedo de Ciñera, Valporquero, Entrepeñas, terraza, estrellas). |
| **Las casas** | Fachada ilustrada de Maelo, Braña y Teleno. Al tocar una ventana se abre su ficha con galería, datos y precio. |
| **Entorno** | Mapa ilustrado con filtros (naturaleza, aventura, nieve, sabores, cómo llegar). Al elegir un lugar se dibuja el camino desde la casa. |
| **Estaciones** | Tira de fotos de dron (otoño / invierno) que se arrastra, con visor a pantalla completa. |
| **Opiniones** | Reseñas reales de Google y Booking.com como notas pegadas. |
| **Reservar** | Selector de casa, calendario de rango y huéspedes, con una estimación por el precio «desde». Desde ahí se va al motor de reservas o se abre WhatsApp o un email con el mensaje ya escrito. |

Está en español e inglés, con el idioma recordado en el navegador. Con `prefers-reduced-motion` se quitan el scroll suave, el parallax y las animaciones ambientales, y todo el contenido sigue visible.

## Stack

- Vite + TypeScript, sin framework.
- GSAP + ScrollTrigger para las animaciones ligadas al scroll, y Lenis para el scroll suave.
- Fraunces y Figtree autoalojadas con Fontsource: sin Google Fonts, lo que también evita problemas de RGPD.

## Estructura

```
src/
  content.ts          contenido real (ES/EN): casas, momentos, lugares, reseñas, FAQ
  i18n.ts             idioma
  scene/palette.ts    paletas por hora del día e interpolación
  scene/valley.ts     el valle ilustrado (SVG generado) y su parallax
  scene/building.ts   la fachada de las tres casas
  sections/*.ts       hero, día, casas, mapa, galería/opiniones, reserva
  styles/main.css     diseño
public/photos/        fotos descargadas de la web oficial
```

## Lighthouse (móvil, build de producción)

| Rendimiento | Accesibilidad | Buenas prácticas | SEO |
| --- | --- | --- | --- |
| 88–90 | 100 | 100 | — |

La puntuación de SEO sale baja a propósito, por el `noindex`. Para producción bastaría con quitar el `noindex` y el `robots.txt`.
