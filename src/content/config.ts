import { defineCollection, z } from 'astro:content';
import { productosFirestoreLoader } from '../loaders/productos-firestore';

const productos = defineCollection({
  loader: productosFirestoreLoader(),
  schema: z.object({
    nombre: z.string(),
    slug: z.string(),
    tipo: z.enum(['anillos', 'manillas', 'aretes', 'dijes', 'charms', 'collares', 'cadenas', 'juegos']),
    genero: z.enum(['dama', 'caballero']),
    subtitulo: z.string().optional(),
    precio: z.number(),
    precioAnterior: z.number().optional(),
    descripcion: z.string(),
    imagenes: z.array(z.string()),
    disponible: z.boolean().default(true),
    secciones: z.array(z.string()).default([]),
    orden: z.number().default(0),
  }),
});

export const collections = { productos };
