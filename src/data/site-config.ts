export const SITE = {
  nombre: 'Duo Style',
  tagline: 'Joyas únicas para quienes brillan con su estilo.',
  descripcion: 'Joyería Duo Style: anillos, manillas y joyas para dama y caballero. Compra fácil y segura por WhatsApp.',
  whatsappNumero: '573132683056',
  whatsappMensajeDefault: 'Hola, me interesa un producto de DUO STYLE.',
  instagram: 'https://www.instagram.com/duostyle.joyeria',
  tiktok: 'https://www.tiktok.com/@joyeria.duo.style',
  logo: '/img/site/logo.jpg',
} as const;

export const TIPOS = [
  { slug: 'anillos', nombre: 'Anillos' },
  { slug: 'manillas', nombre: 'Manillas' },
  { slug: 'aretes', nombre: 'Aretes' },
  { slug: 'dijes', nombre: 'Dijes' },
  { slug: 'charms', nombre: 'Charms' },
  { slug: 'collares', nombre: 'Collares' },
  { slug: 'cadenas', nombre: 'Cadenas' },
  { slug: 'juegos', nombre: 'Juegos' },
] as const;

export const GENEROS = [
  { slug: 'dama', nombre: 'Joyas para Dama' },
  { slug: 'caballero', nombre: 'Joyas para Caballero' },
] as const;

// Colecciones del catálogo de WhatsApp (Meta). Se envían en el feed como
// custom_label_0; el producto puede tenerla fijada desde /admin/ o se asigna
// por reglas en src/lib/feed-meta.ts.
export const COLECCIONES_WHATSAPP = [
  'Anillos de Promesa',
  'Anillos de Princesas',
  'Anillos en Plata 925',
  'Anillos Oro Rosa y Dorados',
  'Manillas y Brazaletes',
  'Pulseras de Flor',
  'Charms Zodiaco',
  'Charms Letras y Especiales',
  'Aretes y Juegos',
] as const;

export function urlWhatsapp(mensaje: string): string {
  return `https://wa.me/${SITE.whatsappNumero}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeProducto(nombre: string, precio: number): string {
  const precioFmt = precio.toLocaleString('es-CO');
  return `Hola, me interesa este producto de DUO STYLE:\n🛍️ *${nombre}*\n💰 $${precioFmt}`;
}
