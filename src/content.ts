// Contenido real de https://www.lafincadelvalle.com/ (textos, datos y fotos).
// Las traducciones al inglés son propias del concepto.

export type Lang = 'es' | 'en';
export type L = { es: string; en: string };

export const CONTACT = {
  email: 'lafincadelvalle01@gmail.com',
  phone: '+34 658 893 770',
  phoneHref: '+34658893770',
  phone2: '+34 658 893 644',
  phone2Href: '+34658893644',
  whatsapp: '34658893770',
  address: 'Barrio Abajo, s/n · 24836 Valle de Vegacervera, León',
  maps: 'https://maps.app.goo.gl/Zo1ukxGVXxTuQDaN9',
  bookingEngine: 'https://www.lafincadelvalle.com/reservas.html',
  booking: 'https://www.booking.com/hotel/es/la-finca-del-valle.html',
  registro: 'AT-LE-161',
};

export interface House {
  id: 'maelo' | 'brana' | 'teleno';
  name: string;
  position: L;
  tagline: L;
  description: L;
  area: number;
  guests: L;
  bedrooms: L;
  beds: L;
  baths: L;
  priceFrom: number;
  photos: { src: string; alt: L }[];
}

export const HOUSES: House[] = [
  {
    id: 'maelo',
    name: 'Maelo',
    position: { es: '01 — Izquierda', en: '01 — Left' },
    tagline: { es: 'Elegancia rústica y conexión con el paisaje.', en: 'Rustic elegance, wired to the landscape.' },
    description: {
      es: 'La referencia visual del conjunto. Maderas de tono medio, vigas expuestas y un gran ventanal que disuelve la frontera entre la sala y el bosque. Rústico contemporáneo con guiños escandinavos.',
      en: 'The visual reference of the estate. Mid-tone timber, exposed beams and a huge window that dissolves the line between living room and forest. Contemporary rustic with a Scandinavian wink.',
    },
    area: 84,
    guests: { es: '4 personas', en: '4 guests' },
    bedrooms: { es: '2 dormitorios', en: '2 bedrooms' },
    beds: { es: '1 de matrimonio + 2 individuales', en: '1 double + 2 singles' },
    baths: { es: '2 baños con ducha', en: '2 bathrooms with shower' },
    priceFrom: 154,
    photos: [
      { src: 'maelo/salon-04.webp', alt: { es: 'Salón de Casa Maelo con gran ventanal al valle', en: 'Casa Maelo living room with a huge window onto the valley' } },
      { src: 'maelo/salon-01.webp', alt: { es: 'Zona de estar con vigas de madera expuestas', en: 'Lounge with exposed timber beams' } },
      { src: 'maelo/dormitorio-01.webp', alt: { es: 'Dormitorio principal con cama de matrimonio', en: 'Main bedroom with double bed' } },
      { src: 'maelo/dormitorio-03.webp', alt: { es: 'Segundo dormitorio con dos camas individuales', en: 'Second bedroom with two single beds' } },
      { src: 'maelo/bano-01.webp', alt: { es: 'Baño con ducha de diseño', en: 'Bathroom with designer shower' } },
      { src: 'maelo/terraza-03.webp', alt: { es: 'Terraza de Maelo al atardecer', en: 'Maelo terrace at sunset' } },
    ],
  },
  {
    id: 'brana',
    name: 'Braña',
    position: { es: '02 — Centro', en: '02 — Centre' },
    tagline: { es: 'Íntima, recogida, hecha para parejas.', en: 'Intimate, cosy, made for couples.' },
    description: {
      es: 'El concepto central del complejo. Más compacta, con una atmósfera envolvente que invita a la desconexión total. Perfecta para una escapada en pareja, con la naturaleza como única compañía.',
      en: 'The central concept of the estate. More compact, with an enveloping atmosphere built for switching off. Perfect for a couple’s escape, with nature as the only company.',
    },
    area: 63,
    guests: { es: '4 personas (sofá cama)', en: '4 guests (sofa bed)' },
    bedrooms: { es: '1 dormitorio', en: '1 bedroom' },
    beds: { es: '1 de matrimonio + sofá cama de matrimonio', en: '1 double + double sofa bed' },
    baths: { es: '1 baño completo', en: '1 full bathroom' },
    priceFrom: 130,
    photos: [
      { src: 'brana/salon-ventanal.webp', alt: { es: 'Salón de Casa Braña con ventanal', en: 'Casa Braña living room with large window' } },
      { src: 'brana/salon-valle.webp', alt: { es: 'Salón con cocina abierta y vistas al valle', en: 'Living room with open kitchen and valley views' } },
      { src: 'brana/dormitorio.webp', alt: { es: 'Dormitorio de matrimonio de Braña', en: 'Braña double bedroom' } },
      { src: 'brana/cocina.webp', alt: { es: 'Cocina de Braña', en: 'Braña kitchen' } },
      { src: 'brana/bano.webp', alt: { es: 'Baño de Braña', en: 'Braña bathroom' } },
      { src: 'brana/terraza-atardecer.webp', alt: { es: 'Terraza de Braña al atardecer', en: 'Braña terrace at sunset' } },
    ],
  },
  {
    id: 'teleno',
    name: 'Teleno',
    position: { es: '03 — Derecha', en: '03 — Right' },
    tagline: { es: 'Carácter propio dentro del conjunto.', en: 'Its own character within the set.' },
    description: {
      es: 'Comparte estructura y calidad con Maelo, pero con personalidad cromática propia: maderas más cálidas, textiles en terracotas y ocres que evocan la tierra del valle.',
      en: 'Same structure and quality as Maelo, with its own colour personality: warmer woods and terracotta and ochre textiles that echo the valley’s earth.',
    },
    area: 84,
    guests: { es: '4 personas', en: '4 guests' },
    bedrooms: { es: '2 dormitorios', en: '2 bedrooms' },
    beds: { es: '1 de matrimonio + 2 individuales', en: '1 double + 2 singles' },
    baths: { es: '2 baños con ducha', en: '2 bathrooms with shower' },
    priceFrom: 154,
    photos: [
      { src: 'teleno/salon-03.webp', alt: { es: 'Comedor de Casa Teleno', en: 'Casa Teleno dining area' } },
      { src: 'teleno/salon-01.webp', alt: { es: 'Salón de Teleno', en: 'Teleno living room' } },
      { src: 'teleno/salon-02.webp', alt: { es: 'Zona de estar de Teleno', en: 'Teleno lounge' } },
      { src: 'teleno/dormitorio-01.webp', alt: { es: 'Dormitorio principal de Teleno', en: 'Teleno main bedroom' } },
      { src: 'teleno/bano-01.webp', alt: { es: 'Baño de Teleno', en: 'Teleno bathroom' } },
      { src: 'teleno/terraza-04.webp', alt: { es: 'Terraza de Teleno', en: 'Teleno terrace' } },
    ],
  },
];

export interface Moment {
  hour: number;
  label: L;
  title: L;
  text: L;
  photo: string;
  alt: L;
}

/** «Un día en la finca»: cada momento usa un dato real de la web. */
export const MOMENTS: Moment[] = [
  {
    hour: 7.2,
    label: { es: 'Amanecer', en: 'Sunrise' },
    title: { es: 'El sol sale entre montañas.', en: 'The sun rises between mountains.' },
    text: {
      es: 'Con el suelo radiante bajo los pies, el ventanal es la primera imagen del día. «Despertar viendo el sol salir entre montañas ha sido mágico», dice un huésped en Google.',
      en: 'Underfloor heating beneath your feet and the big window as the first image of the day. “Waking up to the sun rising between the mountains was magical,” says a Google review.',
    },
    photo: 'maelo/salon-04.webp',
    alt: { es: 'Ventanal de Casa Maelo con la luz de la mañana', en: 'Casa Maelo window in the morning light' },
  },
  {
    hour: 9.8,
    label: { es: 'Mañana', en: 'Morning' },
    title: { es: 'Las rutas salen desde la puerta.', en: 'The trails start at the door.' },
    text: {
      es: 'Tres horas a pie hasta el Faedo de Ciñera, declarado Bosque Mejor Conservado de España, pasando por el Pozo Ibarra. Hay track GPX para usar sin cobertura.',
      en: 'A three-hour walk to the Faedo de Ciñera beech forest, voted Spain’s Best Preserved Forest, via Pozo Ibarra. GPX tracks for when there’s no signal.',
    },
    photo: 'actividades/faedo-cinera.webp',
    alt: { es: 'Hayedo del Faedo de Ciñera', en: 'Faedo de Ciñera beech forest' },
  },
  {
    hour: 12.6,
    label: { es: 'Mediodía', en: 'Midday' },
    title: { es: 'Bajo tierra, a diez minutos.', en: 'Underground, ten minutes away.' },
    text: {
      es: 'La Cueva de Valporquero: siete salas monumentales esculpidas por el agua. Recorrido contemplativo o espeleobarranquismo por su río subterráneo.',
      en: 'Valporquero Cave: seven monumental chambers carved by water. A contemplative tour, or caving down its underground river.',
    },
    photo: 'actividades/valporquero-01.webp',
    alt: { es: 'Interior de la Cueva de Valporquero', en: 'Inside Valporquero Cave' },
  },
  {
    hour: 15.4,
    label: { es: 'Tarde', en: 'Afternoon' },
    title: { es: 'Cecina, chuletón y sobremesa.', en: 'Cured beef, steak and a long lunch.' },
    text: {
      es: 'La recomendación de la casa: Entrepeñas, en Geras de Gordón. Su cecina de wagyu tiene 3 estrellas Great Taste 2026. Reservad sí o sí en fin de semana.',
      en: 'The owners’ top pick: Entrepeñas, in Geras de Gordón. Its wagyu cecina holds 3 Great Taste stars (2026). Book ahead at weekends.',
    },
    photo: 'actividades/entrepenas-cecina-wagyu.jpg',
    alt: { es: 'Cecina de wagyu de Entrepeñas', en: 'Wagyu cecina at Entrepeñas' },
  },
  {
    hour: 19.6,
    label: { es: 'Atardecer', en: 'Sunset' },
    title: { es: 'La terraza se vuelve comedor.', en: 'The terrace becomes the dining room.' },
    text: {
      es: 'Cada casa tiene su terraza equipada, con vistas que cambian con la estación: verde en primavera, dorado en otoño, nevado en invierno.',
      en: 'Each house has its own furnished terrace, with views that change with the seasons: green in spring, gold in autumn, snowy in winter.',
    },
    photo: 'brana/terraza-atardecer.webp',
    alt: { es: 'Terraza de Braña al atardecer', en: 'Braña terrace at sunset' },
  },
  {
    hour: 22.8,
    label: { es: 'Noche', en: 'Night' },
    title: { es: 'El cielo de los Argüellos.', en: 'The Argüellos night sky.' },
    text: {
      es: 'En plena Reserva de la Biosfera, sin ruido ni luces de ciudad. Las tres casas se iluminan y afuera la montaña descansa bajo las estrellas.',
      en: 'Deep inside a UNESCO Biosphere Reserve, with no city noise or light. The three houses glow while the mountain sleeps under the stars.',
    },
    photo: 'hero/slide-01-1200.webp',
    alt: { es: 'Fachada de las casas iluminada al caer la noche', en: 'The houses lit up at nightfall' },
  },
];

/** Capítulos del viaje 3D (mismo orden que CHAPTERS en journey.ts). */
export const JOURNEY: Record<string, { eyebrow: L; title: L; text?: L }> = {
  intro: {
    eyebrow: { es: 'Valle de Vegacervera · León', en: 'Vegacervera Valley · León, Spain' },
    title: { es: 'La Finca del Valle', en: 'La Finca del Valle' },
    text: { es: 'Tres casas de diseño en la Reserva de la Biosfera de los Argüellos. Baja: el viaje empieza aquí arriba.', en: 'Three design houses in the Argüellos Biosphere Reserve. Scroll down: the journey starts up here.' },
  },
  descent: {
    eyebrow: { es: 'Montaña central de León', en: 'León’s central mountains' },
    title: { es: 'Caliza, hayedos y silencio.', en: 'Limestone, beech woods and silence.' },
    text: { es: 'Este es el relieve real de la cordillera, de Pajares al valle del Torío. A 35 minutos de León, con carretera asfaltada hasta la puerta.', en: 'This is the real relief of the range, from Pajares down to the Torío valley. 35 minutes from León, paved road to the door.' },
  },
  house: {
    eyebrow: { es: 'Barrio Abajo · Valle de Vegacervera', en: 'Barrio Abajo · Valle de Vegacervera' },
    title: { es: 'Tres casas, un mismo lenguaje.', en: 'Three houses, one language.' },
    text: { es: 'Pizarra, madera y grandes ventanales al bosque. Suelo radiante, terraza equipada y el pueblo detrás.', en: 'Slate, timber and big windows onto the forest. Underfloor heating, a furnished terrace and the village behind.' },
  },
  sunrise: {
    eyebrow: { es: '07:12 · Amanecer', en: '07:12 · Sunrise' },
    title: { es: 'El sol sale entre montañas.', en: 'The sun rises between mountains.' },
    text: { es: '«Despertar viendo el sol salir entre montañas ha sido mágico», escribe un huésped en Google.', en: '“Waking up to the sun rising between the mountains was magical,” writes a Google reviewer.' },
  },
  golden: {
    eyebrow: { es: '19:36 · Hora dorada', en: '19:36 · Golden hour' },
    title: { es: 'Los caminos salen desde la puerta.', en: 'The trails start at the door.' },
    text: { es: 'Cinco rutas con track GPX empiezan en las casas: de una hora de paseo a tres hasta el Faedo de Ciñera.', en: 'Five GPX trails start at the houses: from a one-hour stroll to three hours to the Faedo de Ciñera.' },
  },
  trail: {
    eyebrow: { es: 'Ruta GPX real · 3 h · media-baja', en: 'Real GPX trail · 3 h · easy-moderate' },
    title: { es: 'Hasta el Faedo de Ciñera.', en: 'To the Faedo de Ciñera.' },
    text: { es: 'El Bosque Mejor Conservado de España, a pie desde la casa y pasando por el Pozo Ibarra.', en: 'Spain’s Best Preserved Forest, on foot from the house via Pozo Ibarra.' },
  },
  winter: {
    eyebrow: { es: 'Invierno', en: 'Winter' },
    title: { es: 'Mismo sitio. Otra estación.', en: 'Same place. Another season.' },
    text: { es: 'Suelo radiante dentro y la nieve a media hora: Valgrande-Pajares a unos 28 km, San Isidro a 55 minutos.', en: 'Underfloor heating inside and snow half an hour away: Valgrande-Pajares about 28 km, San Isidro 55 minutes.' },
  },
  night: {
    eyebrow: { es: '22:47 · Noche', en: '22:47 · Night' },
    title: { es: 'Tres casas encendidas.', en: 'Three houses, lights on.' },
    text: { es: 'Sin ruido ni luces de ciudad: solo el valle y el cielo de los Argüellos encima.', en: 'No noise, no city lights: just the valley and the Argüellos sky above.' },
  },
  outro: {
    eyebrow: { es: '42.889° N · 5.581° W · Valle de Vegacervera', en: '42.889° N · 5.581° W · Vegacervera Valley' },
    title: { es: 'Y el silencio empieza aquí.', en: 'And this is where the silence begins.' },
    text: { es: 'Tres casas de diseño para cuatro personas, desde 130 € la noche.', en: 'Three design houses for four guests, from €130 a night.' },
  },
};

export type Cat = 'trail' | 'nature' | 'adventure' | 'snow' | 'food' | 'arrive';

export interface Place {
  id: string;
  lat: number;
  lon: number;
  cat: Cat;
  name: string;
  meta: L; // distancia/tiempo tal y como lo da la web
  text: L;
  photo?: string;
  trail?: string; // ruta GPX real de la web oficial
}

/** Coordenadas de la casa (las mismas que usa su mapa actual). */
export const FINCA = { lat: 42.88939, lon: -5.58106 };

export const PLACES: Place[] = [
  // Rutas con track GPX real
  { id: 'r-cinera', lat: 42.8806, lon: -5.6155, cat: 'trail', trail: 'valle-faedo-cinera-pozo-ibarra', name: 'Faedo de Ciñera y Pozo Ibarra', meta: { es: 'Desde la casa · 3 h · media-baja', en: 'From the house · 3 h · easy-moderate' }, text: { es: 'Sale de los alojamientos hacia el hayedo de Ciñera, Bosque Mejor Conservado de España y Árbol del Año 2007, pasando por el Pozo Ibarra.', en: 'Leaves from the houses towards the Ciñera beech wood, Spain’s Best Preserved Forest and Tree of the Year 2007, via Pozo Ibarra.' }, photo: 'actividades/faedo-cinera.webp' },
  { id: 'r-valporquero', lat: 42.905, lon: -5.56, cat: 'trail', trail: 'valle-valporquero', name: 'A Valporquero por la Atalaya', meta: { es: 'Desde la casa · 3 h · media-baja', en: 'From the house · 3 h · easy-moderate' }, text: { es: 'Circular hasta Valporquero de Torío pasando por el Mirador de la Atalaya, con panorámica abierta del valle.', en: 'Loop to Valporquero de Torío via the Atalaya viewpoint, with open views over the valley.' } },
  { id: 'r-coladilla', lat: 42.887, lon: -5.56, cat: 'trail', trail: 'valle-coladilla-valle', name: 'Circular a Coladilla', meta: { es: 'Desde la casa · 2 h 30 · baja', en: 'From the house · 2 h 30 · easy' }, text: { es: 'Vuelta sencilla desde los alojamientos hasta el pueblo de Coladilla, cruzando varios robledales.', en: 'An easy loop from the houses to the village of Coladilla, through several oak woods.' } },
  { id: 'r-mirador', lat: 42.886, lon: -5.572, cat: 'trail', trail: 'valle-mirador', name: 'Sendero al Mirador', meta: { es: 'Desde la casa · 1 h 30 · baja', en: 'From the house · 1 h 30 · easy' }, text: { es: 'Paseo corto por robledal que termina en un mirador natural con vistas a Coladilla, Valle y Vegacervera.', en: 'A short walk through oak woods to a natural viewpoint over Coladilla, Valle and Vegacervera.' } },
  { id: 'r-circular', lat: 42.8925, lon: -5.574, cat: 'trail', trail: 'circular-valle', name: 'Circular por encima de Valle', meta: { es: 'Desde la casa · 1 h · muy baja', en: 'From the house · 1 h · very easy' }, text: { es: 'Vuelta corta y suave por encima del pueblo, atravesando un pequeño robledal.', en: 'A short, gentle loop above the village through a small oak wood.' } },
  { id: 'r-calderones', lat: 42.84, lon: -5.785, cat: 'trail', trail: 'ruta-los-calderones-de-piedrasecha', name: 'Desfiladero de los Calderones', meta: { es: '14 km · 2 h · media', en: '14 km · 2 h · moderate' }, text: { es: 'Una hendidura kárstica vertical tan estrecha que casi se tocan las paredes con los brazos abiertos.', en: 'A vertical karst cleft so narrow you can almost touch both walls with your arms outstretched.' }, photo: 'actividades/calderones.webp' },
  { id: 'r-orzonaga', lat: 42.845, lon: -5.555, cat: 'trail', trail: 'faedo-de-orzonaga', name: 'Faedo de Orzonaga', meta: { es: '2 h 30 · media', en: '2 h 30 · moderate' }, text: { es: 'Parte del pueblo de Orzonaga y atraviesa un hayedo de gran valor paisajístico.', en: 'Starts in the village of Orzonaga and crosses a beautiful beech wood.' } },
  { id: 'r-boyariza', lat: 42.888, lon: -5.776, cat: 'trail', trail: 'hayedo-de-la-boyariza-geras', name: 'Hayedo de la Boyariza', meta: { es: '7 km · 2 h · media-baja', en: '7 km · 2 h · easy-moderate' }, text: { es: 'Más de 7 km entre desfiladeros de roca, puentes de madera y bosque atlántico. Para comer: Entrepeñas, en Geras.', en: 'Over 7 km of rocky gorges, wooden bridges and Atlantic forest. Lunch: Entrepeñas, in Geras.' } },
  { id: 'r-villar', lat: 42.905, lon: -5.6, cat: 'trail', trail: 'mtb-valle-puerto-villar-vegacervera', name: 'MTB Puerto del Villar', meta: { es: 'Bici de montaña · desde la casa', en: 'Mountain bike · from the house' }, text: { es: 'Sube al Puerto del Villar y baja hacia Vegacervera por las Hoces. Vistas amplias y descenso técnico.', en: 'Climbs to Puerto del Villar and drops to Vegacervera through the gorge. Wide views, technical descent.' } },
  { id: 'r-dragon', lat: 42.853, lon: -5.645, cat: 'trail', trail: 'valle-roca-dragon', name: 'MTB Roca Dragón', meta: { es: 'Bici de montaña · exigente', en: 'Mountain bike · demanding' }, text: { es: 'Sube hacia la Zona Alfa por la Roca Dragón. Tramos exigentes, conecta con los remontes del Alto Bernesga.', en: 'Climbs to Zona Alfa via Roca Dragón. Demanding sections, linked to the Alto Bernesga bike lifts.' }, photo: 'actividades/buggies.webp' },
  // Lugares
  { id: 'valporquero', lat: 42.9042, lon: -5.5542, cat: 'nature', name: 'Cueva de Valporquero', meta: { es: '10 min en coche', en: '10 min drive' }, text: { es: 'Siete salas monumentales esculpidas por el agua. Visita tranquila o espeleobarranquismo único en Europa.', en: 'Seven monumental chambers carved by water. A calm visit, or caving unlike anywhere in Europe.' }, photo: 'actividades/valporquero-01.webp' },
  { id: 'hoces', lat: 42.874, lon: -5.534, cat: 'nature', name: 'Hoces de Vegacervera', meta: { es: 'A la salida del pueblo', en: 'Right outside the village' }, text: { es: 'El desfiladero del Torío: paredes de caliza de más de 200 m, escalada y vías ferratas.', en: 'The Torío gorge: limestone walls over 200 m high, climbing and via ferratas.' }, photo: 'actividades/escalada.webp' },
  { id: 'playa', lat: 42.8835, lon: -5.5352, cat: 'nature', name: 'Playa fluvial de Vegacervera', meta: { es: 'En el propio Vegacervera', en: 'In Vegacervera itself' }, text: { es: 'Zona de baño en el río Torío, junto a las Hoces. Pradera, sombras y ambiente familiar en verano.', en: 'A river beach on the Torío, beside the gorge. Meadow, shade and a family feel in summer.' }, photo: 'actividades/hoces-vegacervera.jpg' },
  { id: 'entrepenas', lat: 42.8925, lon: -5.7615, cat: 'food', name: 'Entrepeñas · Geras', meta: { es: 'Recomendación TOP', en: 'Top pick' }, text: { es: 'Cecina de wagyu con 3 estrellas Great Taste 2026, arroz con chuletón y jamón. Reservad en fin de semana.', en: 'Wagyu cecina with 3 Great Taste stars (2026), rice with steak and ham. Book at weekends.' }, photo: 'actividades/entrepenas-cecina-wagyu.jpg' },
  { id: 'bernesga', lat: 42.858, lon: -5.66, cat: 'adventure', name: 'Alto Bernesga 4x4', meta: { es: 'Buggies guiados', en: 'Guided buggies' }, text: { es: 'Rutas guiadas en buggy por la Reserva de la Biosfera del Alto Bernesga, con varias duraciones y niveles.', en: 'Guided buggy routes through the Alto Bernesga Biosphere Reserve, in several lengths and levels.' }, photo: 'actividades/buggies.webp' },
  { id: 'porma', lat: 42.8667, lon: -5.323, cat: 'adventure', name: 'Rafting en el Porma · Boñar', meta: { es: 'De junio a septiembre', en: 'June to September' }, text: { es: 'Descenso del Porma en raft con guía desde Boñar. Aguas bravas asequibles y paddle surf en el embalse.', en: 'Guided rafting down the Porma from Boñar. Friendly white water, plus paddle boarding on the reservoir.' } },
  { id: 'pajares', lat: 42.995, lon: -5.768, cat: 'snow', name: 'Valgrande-Pajares', meta: { es: '≈28 km · media hora larga', en: '≈28 km · just over 30 min' }, text: { es: 'La estación más cercana, en la divisoria con Asturias: 21,5 km esquiables, alquiler de material y escuela.', en: 'The nearest ski resort, on the Asturias border: 21.5 km of slopes, rental and ski school.' } },
  { id: 'sanisidro', lat: 43.06, lon: -5.368, cat: 'snow', name: 'San Isidro', meta: { es: '≈55 min en coche', en: '≈55 min drive' }, text: { es: 'La estación de los leoneses, en Puebla de Lillo: cuatro sectores y pistas para todos los niveles.', en: 'León’s own ski resort in Puebla de Lillo: four sectors and runs for every level.' } },
  { id: 'matallana', lat: 42.8665, lon: -5.5225, cat: 'arrive', name: 'Tren · Matallana de Torío', meta: { es: '< 5 km · 9 min', en: '< 5 km · 9 min' }, text: { es: 'La parada de tren más cercana, y mucha gente no sabe que existe. Avisad al reservar y lo organizan con vosotros.', en: 'The closest train stop, and most people don’t know it exists. Let them know when booking and they’ll sort it out.' } },
  { id: 'leon', lat: 42.5987, lon: -5.5671, cat: 'arrive', name: 'León', meta: { es: '35 km · 40 min', en: '35 km · 40 min' }, text: { es: 'Por la LE-311 siguiendo el valle del Torío. AVE desde Madrid en unas dos horas. Carretera asfaltada hasta la puerta.', en: 'Along the LE-311 up the Torío valley. High-speed train from Madrid in about two hours. Paved road to the door.' } },
  { id: 'riano', lat: 42.9706, lon: -5.0, cat: 'adventure', name: 'Riaño y sus fiordos', meta: { es: 'Barco y miradores', en: 'Boat & viewpoints' }, text: { es: 'Navegación en catamarán entre paredes de caliza, el columpio gigante del Alto Valcayo y fauna ibérica.', en: 'Catamaran trips between limestone walls, the giant swing at Alto Valcayo, and Iberian wildlife.' }, photo: 'actividades/fiordos.webp' },
];

export const CATS: { id: Cat | 'all'; label: L; color: string }[] = [
  { id: 'all', label: { es: 'Todo', en: 'All' }, color: 'var(--ink)' },
  { id: 'trail', label: { es: 'Rutas GPX', en: 'GPX trails' }, color: '#1d6a63' },
  { id: 'nature', label: { es: 'Naturaleza', en: 'Nature' }, color: '#2f6a3a' },
  { id: 'adventure', label: { es: 'Aventura', en: 'Adventure' }, color: '#a3421e' },
  { id: 'snow', label: { es: 'Nieve', en: 'Snow' }, color: '#2b6596' },
  { id: 'food', label: { es: 'Sabores', en: 'Food' }, color: '#7a560c' },
  { id: 'arrive', label: { es: 'Cómo llegar', en: 'Getting here' }, color: '#594a7c' },
];

export interface Shot {
  base: string; // ruta sin sufijo de tamaño
  season: 'autumn' | 'winter';
  caption: L;
  alt: L;
}

export const GALLERY: Shot[] = [
  { base: 'dron/otono-casas-cercano', season: 'autumn', caption: { es: 'Otoño · las tres casas desde el prado', en: 'Autumn · the three houses from the meadow' }, alt: { es: 'Vista aérea en otoño de las tres casas sobre el prado', en: 'Aerial autumn view of the three houses above the meadow' } },
  { base: 'dron/invierno-valle-niebla', season: 'winter', caption: { es: 'Invierno · niebla sobre el pueblo', en: 'Winter · fog over the village' }, alt: { es: 'Niebla sobre el valle nevado', en: 'Fog over the snowy valley' } },
  { base: 'dron/otono-paisaje-sol', season: 'autumn', caption: { es: 'Otoño · el valle al caer la tarde', en: 'Autumn · the valley in late afternoon' }, alt: { es: 'El valle en otoño al atardecer', en: 'The valley at autumn sunset' } },
  { base: 'dron/invierno-casas-frontal', season: 'winter', caption: { es: 'Invierno · las mismas casas, nevadas', en: 'Winter · the same houses, under snow' }, alt: { es: 'Las tres casas nevadas con el pueblo al fondo', en: 'The three houses under snow with the village behind' } },
  { base: 'dron/otono-casas-lateral', season: 'autumn', caption: { es: 'Otoño · las casas y el pueblo', en: 'Autumn · the houses and the village' }, alt: { es: 'Las casas en otoño junto al pueblo', en: 'The houses beside the village in autumn' } },
  { base: 'dron/invierno-casas-hacia-valle', season: 'winter', caption: { es: 'Invierno · nevando sobre el valle', en: 'Winter · snowing over the valley' }, alt: { es: 'Nevada sobre las casas y el valle', en: 'Snowfall over the houses and valley' } },
  { base: 'dron/otono-valle-contraluz', season: 'autumn', caption: { es: 'Otoño · bosque rojizo a contraluz', en: 'Autumn · russet woods against the light' }, alt: { es: 'El valle a contraluz en otoño', en: 'The valley backlit in autumn' } },
];

export const REVIEWS: { text: L; who: L }[] = [
  {
    text: {
      es: 'Despertar por la mañana viendo el sol del amanecer saliendo entre montañas ha sido mágico. Y qué personas tan encantadoras los dueños. No me suele gustar repetir destinos, pero estoy seguro de que aquí volveré.',
      en: 'Waking up to the sunrise coming up between the mountains was magical. And the owners are so lovely. I don’t usually repeat destinations, but I’m sure I’ll be back here.',
    },
    who: { es: 'Huésped de Google · dic. 2025', en: 'Google guest · Dec 2025' },
  },
  {
    text: {
      es: 'Hemos estado un grupo en familia en las tres casas: decoradas con un gusto increíble, cada detalle es elegante y a su vez moderno. Se nota que todo está hecho con mucho amor.',
      en: 'We came as a family group and took all three houses: decorated with incredible taste, every detail elegant and modern at once. You can tell it was all made with love.',
    },
    who: { es: 'Huésped de Google · dic. 2025', en: 'Google guest · Dec 2025' },
  },
  {
    text: {
      es: 'Espectacular alojamiento con vistas increíbles. Los dueños son muy amables.',
      en: 'Spectacular place with incredible views. The owners are very kind.',
    },
    who: { es: 'Francisco · Booking.com · may. 2026', en: 'Francisco · Booking.com · May 2026' },
  },
];

export const FAQS: { q: L; a: L }[] = [
  { q: { es: '¿Se admiten mascotas?', en: 'Are pets allowed?' }, a: { es: 'Sí, bajo petición: escribid antes de reservar y os confirman disponibilidad y condiciones para vuestro perro.', en: 'Yes, on request: get in touch before booking to confirm availability and conditions for your dog.' } },
  { q: { es: '¿Horario de entrada y salida?', en: 'Check-in and check-out times?' }, a: { es: 'Entrada a partir de las 16:00 h y salida antes de las 12:00 h.', en: 'Check-in from 4 pm, check-out before 12 noon.' } },
  { q: { es: '¿Cómo funciona el pago?', en: 'How does payment work?' }, a: { es: 'Anticipo del 25 % al reservar, por transferencia. Cancelación gratuita hasta 15 días antes de la entrada.', en: '25% deposit by bank transfer when booking. Free cancellation up to 15 days before arrival.' } },
  { q: { es: '¿Hay WiFi y calefacción?', en: 'Is there WiFi and heating?' }, a: { es: 'WiFi gratuito y suelo radiante en las tres casas, con confort en todas las estaciones.', en: 'Free WiFi and underfloor heating in all three houses, comfortable in every season.' } },
  { q: { es: '¿Hay que hacer pistas de tierra?', en: 'Are there dirt tracks to get there?' }, a: { es: 'No. Se llega por carretera asfaltada hasta las casas y hay sitio para aparcar al lado.', en: 'No. A paved road goes right to the houses, with parking alongside.' } },
];

/** Textos fijos de la interfaz. */
export const UI = {
  navHouses: { es: 'Casas', en: 'Houses' },
  navDay: { es: 'El viaje', en: 'The journey' },
  journeyLoading: { es: 'Cargando el valle', en: 'Loading the valley' },
  preNote: { es: 'Cargando el relieve real del valle', en: 'Loading the valley’s real relief' },
  soundOn: { es: 'Activar sonido', en: 'Turn sound on' },
  soundOff: { es: 'Silenciar', en: 'Mute' },
  journeyStart: { es: 'Baja para empezar el viaje', en: 'Scroll to start the journey' },
  journeyFallback: { es: 'Tu dispositivo muestra la versión en fotos del viaje.', en: 'Your device shows the photo version of the journey.' },
  navMap: { es: 'Entorno', en: 'Around' },
  navGallery: { es: 'Estaciones', en: 'Seasons' },
  navBook: { es: 'Reservar', en: 'Book' },
  skip: { es: 'Saltar al contenido', en: 'Skip to content' },
  menu: { es: 'Menú', en: 'Menu' },

  heroEyebrow: { es: 'Valle de Vegacervera · León', en: 'Vegacervera Valley · León, Spain' },
  heroTitleA: { es: 'La Finca', en: 'La Finca' },
  heroTitleB: { es: 'del Valle', en: 'del Valle' },
  heroLead: {
    es: 'Tres casas de diseño en la Reserva de la Biosfera de los Argüellos, a 35 minutos de León. Y el silencio empieza aquí.',
    en: 'Three design houses inside the Argüellos Biosphere Reserve, 35 minutes from León. And this is where the silence begins.',
  },
  heroCta: { es: 'Reservar estancia', en: 'Book your stay' },
  heroCta2: { es: 'Conocer las casas', en: 'Meet the houses' },
  heroNight: { es: 'Del atardecer a la noche', en: 'From sunset to night' },
  heroPlay: { es: 'Encender o apagar la noche', en: 'Turn night on or off' },
  heroHint: { es: 'Baja: la cámara entra en el valle', en: 'Scroll: the camera flies into the valley' },
  discount: { es: '−35 % reservando en la web', en: '−35% booking direct' },
  stamp: { es: 'reservando en la web', en: 'booking direct' },

  storyEyebrow: { es: 'Nuestra historia', en: 'Our story' },
  storyTitle: { es: 'Hola, somos Manuel y Valeria.', en: 'Hello, we’re Manuel and Valeria.' },
  storyText: {
    es: 'Después de andar un largo camino juntos, decidimos dar un gran cambio a nuestras vidas. Buscábamos naturaleza, tranquilidad, buena mesa y buena gente, y lo encontramos aquí, en plena montaña central de León. Cada espacio y cada detalle está pensado con cariño. Esperamos que os guste tanto como a nosotros.',
    en: 'After a long road together, we decided to change our lives. We were looking for nature, quiet, good food and good people, and we found it here, in the heart of León’s central mountains. Every space and detail was made with care. We hope you love it as much as we do.',
  },
  statHouses: { es: 'casas de diseño', en: 'design houses' },
  statFloor: { es: 'suelo radiante', en: 'underfloor heating' },
  statSilence: { es: 'silencio de montaña', en: 'mountain silence' },
  statGoogle: { es: 'en Google · 44 reseñas', en: 'on Google · 44 reviews' },

  dayEyebrow: { es: 'Un día en la finca', en: 'A day at the finca' },
  dayTitle: { es: 'Del primer café a la última estrella.', en: 'From the first coffee to the last star.' },
  dayHint: { es: 'Sigue bajando: el sol avanza contigo', en: 'Keep scrolling: the sun moves with you' },

  housesEyebrow: { es: 'Las casas', en: 'The houses' },
  housesTitle: { es: 'Un edificio, tres caracteres.', en: 'One building, three characters.' },
  housesLead: {
    es: 'Maelo, Braña y Teleno comparten arquitectura y entorno. Toca una ventana para entrar.',
    en: 'Maelo, Braña and Teleno share architecture and setting. Tap a window to step inside.',
  },
  enter: { es: 'Entrar en', en: 'Step into' },
  from: { es: 'desde', en: 'from' },
  night: { es: 'noche', en: 'night' },
  area: { es: 'Superficie', en: 'Size' },
  guests: { es: 'Capacidad', en: 'Sleeps' },
  rooms: { es: 'Dormitorios', en: 'Bedrooms' },
  beds: { es: 'Camas', en: 'Beds' },
  baths: { es: 'Baños', en: 'Bathrooms' },
  extras: { es: 'Suelo radiante · Terraza equipada · WiFi', en: 'Underfloor heating · Furnished terrace · WiFi' },
  bookThis: { es: 'Reservar', en: 'Book' },
  close: { es: 'Cerrar', en: 'Close' },
  prev: { es: 'Anterior', en: 'Previous' },
  next: { es: 'Siguiente', en: 'Next' },

  mapEyebrow: { es: 'Alrededor', en: 'Around' },
  mapTitle: { es: 'Todo el valle, desde la puerta.', en: 'The whole valley, from the front door.' },
  mapLead: {
    es: 'El relieve real del valle en 3D, con las rutas GPX que salen desde la puerta. Arrastra para girar y elige un sitio: la cámara vuela hasta él.',
    en: 'The valley’s real relief in 3D, with GPX trails that start at the door. Drag to rotate and pick a place: the camera flies there.',
  },
  mapPick: { es: 'Elige un lugar en el mapa', en: 'Pick a place on the map' },
  mapHome: { es: 'La Finca', en: 'La Finca' },
  mapHint: { es: 'Arrastra para girar · Ctrl + rueda para acercar', en: 'Drag to rotate · Ctrl + wheel to zoom' },
  mapHintTouch: { es: 'Usa dos dedos para mover el mapa', en: 'Use two fingers to move the map' },
  mapReset: { es: 'Volver a la casa', en: 'Back to the house' },
  zoomIn: { es: 'Acercar', en: 'Zoom in' },
  zoomOut: { es: 'Alejar', en: 'Zoom out' },
  mapCredit: { es: 'Relieve: Terrain Tiles (AWS Open Data / Mapzen) · Rutas GPX: La Finca del Valle', en: 'Relief: Terrain Tiles (AWS Open Data / Mapzen) · GPX trails: La Finca del Valle' },
  mapNoGL: { es: 'Tu navegador no puede mostrar el mapa 3D. Aquí tienes los lugares:', en: 'Your browser can’t show the 3D map. Here are the places:' },

  galleryEyebrow: { es: 'Cuatro estaciones', en: 'Four seasons' },
  galleryTitle: { es: 'Mismo sitio. Otra estación.', en: 'Same place. Another season.' },
  galleryLead: {
    es: 'Ninguna foto está tomada lejos: es el valle que se ve desde la puerta. Lo que cambia es la estación.',
    en: 'None of these photos were taken far away: it’s the valley you see from the door. Only the season changes.',
  },
  autumn: { es: 'Otoño', en: 'Autumn' },
  winter: { es: 'Invierno', en: 'Winter' },
  allSeasons: { es: 'Todas', en: 'All' },
  seasonSwitch: { es: 'Cambiar estación', en: 'Switch season' },

  reviewsEyebrow: { es: 'Opiniones', en: 'Reviews' },
  reviewsTitle: { es: 'Lo que dicen al irse.', en: 'What guests say on the way out.' },
  reviewsBadge1: { es: '5,0 en Google · 44 reseñas', en: '5.0 on Google · 44 reviews' },
  reviewsBadge2: { es: '«Excepcional» en Booking.com', en: '“Exceptional” on Booking.com' },

  bookEyebrow: { es: 'Reservar', en: 'Book' },
  bookTitle: { es: 'Tu refugio te espera.', en: 'Your hideaway is waiting.' },
  bookLead: {
    es: 'Elige casa, fechas y huéspedes. Te calculamos una estimación y te llevamos al motor de reservas con el 35 % de descuento web.',
    en: 'Pick a house, dates and guests. We’ll estimate the price and send you to the booking engine with the 35% direct-booking discount.',
  },
  step1: { es: 'Casa', en: 'House' },
  step2: { es: 'Fechas', en: 'Dates' },
  step3: { es: 'Huéspedes', en: 'Guests' },
  checkin: { es: 'Entrada', en: 'Check-in' },
  checkout: { es: 'Salida', en: 'Check-out' },
  nights: { es: 'noches', en: 'nights' },
  pickDates: { es: 'Marca entrada y salida en el calendario', en: 'Pick check-in and check-out on the calendar' },
  extraBed: { es: 'La 5.ª plaza es una cama supletoria bajo petición.', en: 'A 5th guest uses an extra bed, on request.' },
  estimate: { es: 'Estimación', en: 'Estimate' },
  estimateNote: {
    es: 'Calculado con el precio «desde». El precio exacto, con el descuento aplicado, lo da el motor de reservas.',
    en: 'Based on the “from” price. The exact price, discount included, comes from the booking engine.',
  },
  goEngine: { es: 'Ver precio exacto y reservar', en: 'See exact price and book' },
  goWhatsapp: { es: 'Preguntar por WhatsApp', en: 'Ask on WhatsApp' },
  goEmail: { es: 'Escribir un email', en: 'Send an email' },
  policy1: { es: 'Anticipo 25 %', en: '25% deposit' },
  policy2: { es: 'Cancelación gratis hasta 15 días antes', en: 'Free cancellation up to 15 days before' },
  policy3: { es: 'Mascotas bajo petición', en: 'Pets on request' },
  faqTitle: { es: 'Preguntas rápidas', en: 'Quick questions' },

  footerTag: { es: 'Reserva de la Biosfera de los Argüellos', en: 'Argüellos Biosphere Reserve' },
  conceptBar: { es: 'Concepto no oficial · demo sin reservas ni contacto reales', en: 'Unofficial concept · demo, no real bookings or contact' },
  demoNote: { es: 'Demo: en la web final, este botón abriría la reserva o el contacto real.', en: 'Demo: on the final site this button would open the real booking or contact.' },
  contactHidden: { es: 'Teléfono y email ocultos en esta demo.', en: 'Phone and email hidden in this demo.' },
  footerConcept: {
    es: 'Concepto de rediseño no oficial. Textos, datos y fotografías: La Finca del Valle.',
    en: 'Unofficial redesign concept. Copy, data and photography: La Finca del Valle.',
  },
};
