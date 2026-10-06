// Reglas para el feed del catálogo de WhatsApp (Meta Commerce Manager).
// Meta revisa títulos y descripciones contra su política de propiedad
// intelectual, así que aquí se quitan marcas de terceros y personajes.

import { COLECCIONES_WHATSAPP, SITE, TIPOS } from '../data/site-config';

export type ProductoFeed = {
  id: string;
  nombre: string;
  slug: string;
  tipo: string;
  subtitulo?: string;
  precio: number;
  descripcion: string;
  imagenes: string[];
  tituloMeta?: string;
  coleccion?: string;
};

type Coleccion = (typeof COLECCIONES_WHATSAPP)[number];

const SITE_URL = (import.meta.env.SITE as string).replace(/\/$/, '');

// Marcas y personajes que no pueden aparecer en el título del feed.
export const MARCAS_TERCEROS =
  /pandora|van ?cleef|disney|frozen|ariel|\belsa\b|\belza\b|\banna\b|jasmine|aladd|cenicienta|rapunzel|enredados|blanca ?nieves|bestia|evangeline|princesa y el sapo|stitch|reina malvada/i;

// Productos con personajes: el nombre no sirve como título, se describe el diseño.
const TITULOS_POR_SLUG: Record<string, string> = {
  'anillo-cenicienta-pandora': 'Anillo Princesa Carroza Gema Azul',
  'anillo-de-ariel-pandora': 'Anillo Princesa Sirena',
  'anillo-de-blanca-nieves-pandora': 'Anillo Princesa Lazo Rojo',
  'anillo-de-la-bella-y-la-bestia-pandora': 'Anillo Princesa Rosa Encantada',
  'anillo-evangeline-pandora': 'Anillo Princesa Luciérnaga',
  'anillo-frozen-pandora-elza': 'Anillo Princesa de Hielo',
  'anillo-princesa-jasmine-pandora': 'Anillo Princesa Cristal Azul',
  'anillo-rapunzel-pandora': 'Anillo Princesa Cristal Violeta',
  'anillo-reina-malvada-pandora': 'Anillo Corazón Espada Fucsia',
  'charm-stitch-pandora': 'Charm Alien Azul',
};

const PERSONAJES = /cenicienta|ariel|blanca-nieves|bella-y-la-bestia|evangeline|frozen|jasmine|rapunzel|reina-malvada|tiara/;

const MINUSCULAS = new Set(['y', 'de', 'con', 'la', 'el', 'en', 'del']);

function capitalizar(texto: string): string {
  return texto
    .split(' ')
    .map((palabra, i) => {
      const min = palabra.toLowerCase();
      if (i > 0 && MINUSCULAS.has(min)) return min;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

function material(p: ProductoFeed): string {
  const sub = p.subtitulo ?? '';
  if (/oro rosa/i.test(sub)) return 'Plata 925 con Baño de Oro Rosa';
  if (/baño de oro|^oro\b/i.test(sub)) return 'Plata 925 con Baño de Oro';
  if (/^rodio/i.test(sub)) return 'Rodio';
  return 'Plata 925';
}

function baseTitulo(p: ProductoFeed): string {
  const porSlug = TITULOS_POR_SLUG[p.slug.replace(/-variante-\d+$/, '')];
  if (porSlug) return porSlug;

  // Pulseras de flor: "Pulsera Flor Nácar Blanco" a partir de "Piedra efecto nácar blanco".
  const piedra = p.subtitulo?.match(/Piedra efecto ([^•]+)/i);
  if (/van-cleef/.test(p.slug) && piedra) return `Pulsera Flor ${capitalizar(piedra[1].trim())}`;

  return capitalizar(
    p.nombre
      .replace(/van ?cleef|pandora|plata (ley )?925|rodio/gi, ' ')
      .replace(/[-–]/g, ' ')
      .replace(/\bcorazon\b/gi, 'Corazón')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function tituloMeta(p: ProductoFeed): string {
  if (p.tituloMeta?.trim()) return p.tituloMeta.trim();
  return `${baseTitulo(p)} ${material(p)}`;
}

// Charms y manillas de charms/serpiente son compatibles con pulseras tipo Pandora.
function esCompatiblePandora(p: ProductoFeed): boolean {
  return p.tipo === 'charms' || (p.tipo === 'manillas' && /serpiente|charms|eslabones/.test(p.slug));
}

const CIERRE_EMPAQUE = 'Llega en nuestro empaque de regalo Duo Style.';
const CIERRE_COMPATIBLE = 'Compatible con pulseras tipo Pandora.';

export function descripcionMeta(p: ProductoFeed): string {
  const limpia = p.descripcion
    .replace(/\binspirada en el icónico diseño Van Cleef,?\s*/gi, '')
    .replace(/\baniño\b/g, 'anillo')
    // Ya lo dice el cierre CIERRE_COMPATIBLE que se agrega al final.
    .replace(/Compatible con pulseras tipo Pandora y otras de estilo similar\.?/gi, '')
    .replace(/\s+(tipo\s+)?Pandora\b/g,(m, tipo, offset, s) =>
      // "estilo Pandora" se deja para que la frase completa se descarte abajo.
      /estilo\s*$/i.test(s.slice(0, offset)) ? m : '')
    .replace(/\.,\s*(\w)/g, (_, letra) => `. ${letra.toUpperCase()}`)
    .replace(/\s+/g, ' ')
    .trim();

  // Se descartan las frases que todavía mencionen marcas o personajes.
  const frases = limpia
    .split(/(?<=[.!?])\s+/)
    .filter(f => !MARCAS_TERCEROS.test(f) && !f.includes(CIERRE_EMPAQUE));

  let texto = frases.join(' ').trim();
  if (texto.length < 60) texto = `${tituloMeta(p)}. ${p.subtitulo ?? ''}`.trim();
  if (!/[.!?✨💍💗💙❤️]$/u.test(texto)) texto += '.';

  return [texto, esCompatiblePandora(p) ? CIERRE_COMPATIBLE : '', CIERRE_EMPAQUE].filter(Boolean).join(' ');
}

export function coleccionMeta(p: ProductoFeed): Coleccion | '' {
  if (p.coleccion && (COLECCIONES_WHATSAPP as readonly string[]).includes(p.coleccion)) return p.coleccion as Coleccion;
  const sub = p.subtitulo ?? '';
  switch (p.tipo) {
    case 'anillos':
      if (PERSONAJES.test(p.slug)) return 'Anillos de Princesas';
      if (/oro/i.test(sub)) return 'Anillos Oro Rosa y Dorados';
      if (/corazon|you-me|infinito/.test(p.slug)) return 'Anillos de Promesa';
      return 'Anillos en Plata 925';
    case 'manillas':
      return /van-cleef|flor/.test(p.slug) ? 'Pulseras de Flor' : 'Manillas y Brazaletes';
    case 'charms':
      return /zodiacal/.test(p.slug) ? 'Charms Zodiaco' : 'Charms Letras y Especiales';
    case 'aretes':
    case 'juegos':
      return 'Aretes y Juegos';
    default:
      return '';
  }
}

function urlAbsoluta(url: string): string {
  return url.startsWith('/') ? encodeURI(SITE_URL + url) : url;
}

const COLUMNAS = [
  'id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link',
  'additional_image_link', 'brand', 'google_product_category', 'product_type', 'custom_label_0',
] as const;

function celdaCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export function filaFeed(p: ProductoFeed): Record<(typeof COLUMNAS)[number], string> {
  const [principal, ...adicionales] = p.imagenes.map(urlAbsoluta);
  return {
    id: p.id,
    title: tituloMeta(p),
    description: descripcionMeta(p),
    availability: 'in stock',
    condition: 'new',
    price: `${p.precio} COP`,
    link: `${SITE_URL}/${p.tipo}/${p.slug}/`,
    image_link: principal ?? '',
    additional_image_link: adicionales.slice(0, 20).join(','),
    brand: SITE.nombre,
    google_product_category: 'Apparel & Accessories > Jewelry',
    product_type: TIPOS.find(t => t.slug === p.tipo)?.nombre ?? p.tipo,
    custom_label_0: coleccionMeta(p),
  };
}

export function generarCsv(productos: ProductoFeed[]): string {
  const filas = productos.map(p => {
    const f = filaFeed(p);
    return COLUMNAS.map(c => celdaCsv(f[c])).join(',');
  });
  return [COLUMNAS.join(','), ...filas].join('\n') + '\n';
}
