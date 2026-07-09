import { urlWhatsapp } from '../data/site-config';

export interface ItemCarrito {
  id: string;
  nombre: string;
  tipo: string;
  slug: string;
  precio: number;
  imagen?: string;
  cantidad: number;
}

const CLAVE_STORAGE = 'duostyle-carrito';

export function obtenerCarrito(): ItemCarrito[] {
  try {
    const raw = localStorage.getItem(CLAVE_STORAGE);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function guardarCarrito(items: ItemCarrito[]): void {
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent<ItemCarrito[]>('carrito:cambio', { detail: items }));
}

export function agregarAlCarrito(
  producto: { nombre: string; tipo: string; slug: string; precio: number; imagen?: string },
  cantidad = 1
): void {
  const id = `${producto.tipo}/${producto.slug}`;
  const items = obtenerCarrito();
  const existente = items.find(i => i.id === id);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    items.push({ id, cantidad, ...producto });
  }
  guardarCarrito(items);
}

export function quitarDelCarrito(id: string): void {
  guardarCarrito(obtenerCarrito().filter(i => i.id !== id));
}

export function cambiarCantidad(id: string, delta: number): void {
  const items = obtenerCarrito();
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.cantidad += delta;
  guardarCarrito(item.cantidad <= 0 ? items.filter(i => i.id !== id) : items);
}

export function vaciarCarrito(): void {
  guardarCarrito([]);
}

export function totalCarrito(items: ItemCarrito[]): number {
  return items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
}

export function cantidadTotal(items: ItemCarrito[]): number {
  return items.reduce((suma, i) => suma + i.cantidad, 0);
}

export function mensajeCarritoWhatsapp(items: ItemCarrito[]): string {
  const lineas = items.map((i, idx) => {
    const subtotalFmt = (i.precio * i.cantidad).toLocaleString('es-CO');
    const precioFmt = i.precio.toLocaleString('es-CO');
    const detalle = i.cantidad > 1 ? `(x${i.cantidad}) — $${precioFmt} c/u = $${subtotalFmt}` : `— $${precioFmt}`;
    return `${idx + 1}. *${i.nombre}* ${detalle}`;
  });
  const totalFmt = totalCarrito(items).toLocaleString('es-CO');
  return [
    'Hola, quiero hacer este pedido de DUO STYLE 🛍️',
    '',
    ...lineas,
    '',
    `💰 *Total: $${totalFmt}*`,
  ].join('\n');
}

export function urlWhatsappCarrito(items: ItemCarrito[]): string {
  return urlWhatsapp(mensajeCarritoWhatsapp(items));
}
