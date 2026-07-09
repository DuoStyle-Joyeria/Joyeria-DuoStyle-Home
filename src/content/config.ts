import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const productos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/productos' }),
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
    destacado: z.boolean().default(false),
  }),
});

export const collections = { productos };
