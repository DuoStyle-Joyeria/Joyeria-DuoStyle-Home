// Script de migración de un solo uso: extrae productos de los HTML legacy
// (legacy/anillos.html, legacy/manillas.html, legacy/dama.html), deduplica
// tarjetas copiadas y pegadas por error, comprime sus imágenes con sharp, y
// genera src/content/productos/<categoria>/<slug>.json.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const LEGACY_DIR = path.join(ROOT, 'legacy');
const SRC_IMG_DIR = path.join(ROOT, 'assets', 'img');
const OUT_CONTENT_DIR = path.join(ROOT, 'src', 'content', 'productos');
const OUT_PUBLIC_IMG_DIR = path.join(ROOT, 'public', 'img');

const FUENTES = [
  { archivo: 'anillos.html', categoria: 'anillos' },
  { archivo: 'manillas.html', categoria: 'manillas' },
  { archivo: 'dama.html', categoria: 'dama' },
];

function slugify(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function indexarImagenesFuente(dir, acc = new Map()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) indexarImagenesFuente(full, acc);
    else acc.set(full.toLowerCase(), full);
  }
  return acc;
}

function resolverRutaImagen(srcAttr, indiceImagenes) {
  const rutaEsperada = path.join(ROOT, decodeURIComponent(srcAttr));
  return indiceImagenes.get(rutaEsperada.toLowerCase()) ?? null;
}

async function comprimirImagen(origen, destino) {
  mkdirSync(path.dirname(destino), { recursive: true });
  await sharp(origen)
    .rotate()
    .resize({ width: 1400, withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toFile(destino);
}

async function main() {
  const indiceImagenes = indexarImagenesFuente(SRC_IMG_DIR);
  const resumen = [];
  let totalDuplicadosDescartados = 0;

  for (const { archivo, categoria } of FUENTES) {
    const html = readFileSync(path.join(LEGACY_DIR, archivo), 'utf-8');
    const $ = cheerio.load(html);

    const crudos = $('.producto-card').toArray().map(card => {
      const $card = $(card);
      const nombre = ($card.attr('data-nombre') || '').trim();
      const descripcion = ($card.attr('data-descripcion') || '').trim();
      const precio = parseInt($card.attr('data-precio') || '0', 10);
      const precioAnteriorRaw = $card.attr('data-precio-anterior');
      const precioAnterior = precioAnteriorRaw ? parseInt(precioAnteriorRaw, 10) : undefined;
      const subtitulo = $card.find('> p').first().text().trim();
      const imgsGaleria = $card.find('.galeria-imagenes img').toArray().map(img => $(img).attr('src')).filter(Boolean);
      const imgPrincipal = $card.find('> img').first().attr('src');
      // La imagen principal va primero y siempre se incluye como respaldo:
      // algunos productos tienen typos en las rutas de la galería que la
      // dejarían sin ninguna imagen si solo confiáramos en la galería.
      const combinadas = [imgPrincipal, ...imgsGaleria].filter(Boolean);
      const fuentesImg = [...new Set(combinadas)];
      return { nombre, descripcion, precio, precioAnterior, subtitulo, fuentesImg };
    }).filter(c => c.nombre);

    // Deduplicar: mismo precio + mismo conjunto de rutas de imagen origen (resueltas)
    // = tarjeta copiada y pegada por error, no una variante real.
    const vistos = new Map(); // fingerprint -> true
    const unicos = [];
    for (const card of crudos) {
      const rutasResueltas = card.fuentesImg
        .map(src => resolverRutaImagen(src, indiceImagenes))
        .filter(Boolean)
        .map(p => p.toLowerCase())
        .sort();
      const fingerprint = `${card.precio}|${rutasResueltas.join(',')}`;
      if (rutasResueltas.length > 0 && vistos.has(fingerprint)) {
        totalDuplicadosDescartados++;
        continue;
      }
      if (rutasResueltas.length > 0) vistos.set(fingerprint, true);
      unicos.push(card);
    }

    const slugsUsados = new Map();
    let contador = 0;

    for (const card of unicos) {
      let slugBase = slugify(card.nombre);
      if (!slugBase) slugBase = `producto-${contador}`;
      const usos = slugsUsados.get(slugBase) || 0;
      slugsUsados.set(slugBase, usos + 1);
      const slug = usos === 0 ? slugBase : `${slugBase}-variante-${usos + 1}`;

      const imagenesFinal = [];
      for (let i = 0; i < card.fuentesImg.length; i++) {
        const origen = resolverRutaImagen(card.fuentesImg[i], indiceImagenes);
        if (!origen) {
          resumen.push(`⚠️  ${categoria}/${slug}: no se encontró la imagen "${card.fuentesImg[i]}"`);
          continue;
        }
        const destinoPublico = `/img/${categoria}/${slug}/${i + 1}.jpg`;
        const destinoAbsoluto = path.join(OUT_PUBLIC_IMG_DIR, categoria, slug, `${i + 1}.jpg`);
        try {
          await comprimirImagen(origen, destinoAbsoluto);
          imagenesFinal.push(destinoPublico);
        } catch (err) {
          resumen.push(`⚠️  ${categoria}/${slug}: error comprimiendo "${card.fuentesImg[i]}" (${err.message})`);
        }
      }

      const producto = {
        nombre: card.nombre,
        slug,
        categoria,
        subtitulo: card.subtitulo,
        precio: card.precio,
        ...(card.precioAnterior ? { precioAnterior: card.precioAnterior } : {}),
        descripcion: card.descripcion,
        imagenes: imagenesFinal,
        disponible: true,
        destacado: false,
      };

      mkdirSync(path.join(OUT_CONTENT_DIR, categoria), { recursive: true });
      writeFileSync(
        path.join(OUT_CONTENT_DIR, categoria, `${slug}.json`),
        JSON.stringify(producto, null, 2) + '\n',
        'utf-8'
      );
      contador++;
    }

    resumen.push(`✅ ${categoria}: ${contador} productos únicos migrados desde ${archivo} (${crudos.length - unicos.length} duplicados exactos descartados)`);
  }

  resumen.push(`\nTotal duplicados exactos descartados: ${totalDuplicadosDescartados}`);
  console.log(resumen.join('\n'));
}

main();
