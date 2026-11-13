/** Ruta a un archivo de public/, válida tanto en la web normal como en la demo publicada con rutas relativas. */
export const asset = (p: string) => import.meta.env.BASE_URL + p;
