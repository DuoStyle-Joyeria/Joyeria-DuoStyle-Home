import { defineCollection, z } from 'astro:content';
import { productosFirestoreLoader } from '../loaders/productos-firestore';

const productos = defineCollection({
  loader: productosFirestoreLoader(),
  schema: z.object({
    nombre: z.string(),
    slug: z.string(),
    categoria: z.enum(['anillos', 'manillas', 'dama', 'caballero']),
    subtitulo: z.string().optional(),
    precio: z.number(),
    precioAnterior: z.number().optional(),
    descripcion: z.string(),
    imagenes: z.array(z.string()),
    disponible: z.boolean().default(true),
    secciones: z.array(z.string()).default([]),
  }),
});

export const collections = { productos };
