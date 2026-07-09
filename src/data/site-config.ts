export const SITE = {
  nombre: 'Duo Style',
  tagline: 'Joyas únicas para quienes brillan con su estilo.',
  descripcion: 'Joyería Duo Style: anillos, manillas y joyas para dama y caballero. Compra fácil y segura por WhatsApp.',
  whatsappNumero: '573209074830',
  whatsappMensajeDefault: 'Hola, me interesa un producto de DUO STYLE.',
  instagram: 'https://www.instagram.com/duostyle.joyeria',
  tiktok: 'https://www.tiktok.com/@joyeria.duo.style',
  logo: '/img/site/logo.jpg',
} as const;

export const CATEGORIAS = [
  { slug: 'anillos', nombre: 'Anillos' },
  { slug: 'manillas', nombre: 'Manillas' },
  { slug: 'dama', nombre: 'Joyas para Dama' },
  { slug: 'caballero', nombre: 'Joyas para Caballero' },
] as const;

export function urlWhatsapp(mensaje: string): string {
  return `https://wa.me/${SITE.whatsappNumero}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeProducto(nombre: string, precio: number): string {
  const precioFmt = precio.toLocaleString('es-CO');
  return `Hola, me interesa este producto de DUO STYLE:\n🛍️ *${nombre}*\n💰 $${precioFmt}`;
}
