// Feed del catálogo de WhatsApp para Meta Commerce Manager (feed programado).
// Se genera en cada build, así que se actualiza solo cuando el panel admin
// guarda un producto y dispara el Deploy Hook. Reglas en src/lib/feed-meta.ts.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { generarCsv } from '../../lib/feed-meta';

export const GET: APIRoute = async () => {
  const productos = await getCollection('productos', p => p.data.disponible);
  const csv = generarCsv(
    productos
      .map(p => ({ id: p.id, ...p.data }))
      .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre))
  );
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
};
