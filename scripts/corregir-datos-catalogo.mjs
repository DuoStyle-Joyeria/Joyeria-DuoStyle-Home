// Script de un solo uso: corrige errores de datos del catálogo detectados al
// preparar el feed de Meta (subtítulos mal escritos, material, tipo y precios).
// No cambia nombres ni slugs (eso cambiaría las URLs de los productos).
//
// Por defecto es solo lectura: muestra la tabla de cambios y no escribe nada.
//   GOOGLE_APPLICATION_CREDENTIALS="ruta/a/tu-clave.json" node scripts/corregir-datos-catalogo.mjs
// Para escribir en Firestore:
//   GOOGLE_APPLICATION_CREDENTIALS="ruta/a/tu-clave.json" node scripts/corregir-datos-catalogo.mjs --aplicar
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('Falta GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_KEY.');
  process.exit(1);
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
} else {
  initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
}

const db = getFirestore();
const APLICAR = process.argv.includes('--aplicar');
const BORRAR = Symbol('borrar');

// Anillo Corazón Blanco estaba duplicado con el mismo slug; se conserva el que
// se ve en la web (variante-2, tallas 6-10) y se borra este.
const DOC_A_BORRAR = 'anillos-anillo-corazon-blanco-pandora';
const CORAZON_BLANCO = 'anillos-anillo-corazon-blanco-pandora-variante-2';

const BANO_DE_ORO = 'Plata 925 con baño de oro • Tallas 6-10';

// Anillos abiertos/ajustables y Mariquita conservan sus tallas propias.
const esTallaEspecial = p => /abierto|ajustable|mariquita/i.test(`${p.slug} ${p.subtitulo ?? ''}`);

// Cada cambio se calcula a partir del valor actual del documento, buscado por
// slug, o por doc ID cuando el slug está repetido.
const CAMBIOS = [
  // "PALTA • PANDORA" → "Plata 925"
  ...['aretes-piedra-de-corazon-pandora', 'juego-aretes-y-collar-corazon-blanco-pandora', 'pulsera-tejido-serpiente-broche-de-corazon-pandora']
    .map(slug => ({ slug, campo: 'subtitulo', nuevo: () => 'Plata 925' })),
  // Ortografía de subtítulos
  { slug: 'anillo-princesa-jasmine-pandora', campo: 'subtitulo', nuevo: p => p.subtitulo.replace(/^Plata\s*•\s*/, 'Plata 925 • ') },
  // Subtítulo "Pandora" → material (confirmado: plata 925)
  ...['anillo-corazon-azul-pandora', 'anillo-corazon-lila-pandora', 'anillo-corazon-rojo-pandora', 'anillo-reina-malvada-pandora']
    .map(slug => ({ slug, campo: 'subtitulo', nuevo: p => p.subtitulo.replace(/^Pandora\b/, 'Plata 925') })),
  // Anillos dorados (confirmado)
  ...['anillo-cenicienta-pandora', 'anillo-rapunzel-pandora', 'anillo-sol-pandora']
    .map(slug => ({ slug, campo: 'subtitulo', nuevo: () => BANO_DE_ORO })),
  // Tipo mal asignado
  { slug: 'manilla-serpiente-broche-corona-brillante-pandora', campo: 'tipo', nuevo: () => 'manillas' },
  // Anillos en oro rosa o baño de oro → $250.000
  ...['anillo-corazon-rosado-pandora', 'anillo-doble-banda-bicolor', 'anillo-tiara-gotas-moradas-pandora',
      'anillo-cenicienta-pandora', 'anillo-rapunzel-pandora', 'anillo-sol-pandora']
    .map(slug => ({ slug, campo: 'precio', nuevo: () => 250000 })),
  { id: CORAZON_BLANCO, campo: 'precio', nuevo: () => 250000 },
  // Precio anterior menor que el actual
  { slug: 'anillo-doble-banda-bicolor', campo: 'precioAnterior', nuevo: () => BORRAR },
];

async function main() {
  const snap = await db.collection('productos').get();
  const porSlug = new Map();
  for (const doc of snap.docs) {
    if (doc.id === DOC_A_BORRAR) continue;
    const lista = porSlug.get(doc.data().slug) ?? [];
    lista.push(doc);
    porSlug.set(doc.data().slug, lista);
  }
  console.log(`Productos en Firestore: ${snap.size} (disponibles: ${snap.docs.filter(d => d.data().disponible !== false).length})\n`);

  // Talla general de anillos: "Tallas 4-9" → "Tallas 6-10", salvo tallas especiales.
  const especiales = [];
  for (const doc of snap.docs) {
    const p = doc.data();
    if (doc.id === DOC_A_BORRAR || p.tipo !== 'anillos') continue;
    if (esTallaEspecial(p)) especiales.push(`${p.slug} | ${p.subtitulo}`);
    else if (/Tallas 4-9/.test(p.subtitulo ?? '')) CAMBIOS.push({ id: doc.id, campo: 'subtitulo', nuevo: x => x.subtitulo.replace('Tallas 4-9', 'Tallas 6-10') });
  }

  const updates = new Map();
  const filas = [];
  for (const c of CAMBIOS) {
    const docs = c.id ? snap.docs.filter(d => d.id === c.id) : (porSlug.get(c.slug) ?? []);
    c.slug ??= docs[0]?.data().slug;
    if (docs.length !== 1) {
      filas.push([c.slug, c.campo, `ERROR: ${docs.length} documentos con ese slug`, '']);
      continue;
    }
    const doc = docs[0];
    const datos = { ...doc.data(), ...updates.get(doc.id)?.vista };
    const antes = datos[c.campo];
    const despues = c.nuevo(datos);
    if (antes === despues) {
      filas.push([c.slug, c.campo, String(antes), '(sin cambio)']);
      continue;
    }
    const u = updates.get(doc.id) ?? { ref: doc.ref, cambios: {}, vista: {} };
    u.cambios[c.campo] = despues === BORRAR ? FieldValue.delete() : despues;
    u.vista[c.campo] = despues === BORRAR ? undefined : despues;
    updates.set(doc.id, u);
    filas.push([c.slug, c.campo, antes === undefined ? '(vacío)' : String(antes), despues === BORRAR ? '(eliminado)' : String(despues)]);
  }

  // El cambio de tipo cambia la URL /{tipo}/{slug}/: verificar que no choque.
  for (const [id, u] of updates) {
    if (u.cambios.tipo) {
      const slug = (await u.ref.get()).data().slug;
      const choque = (porSlug.get(slug) ?? []).some(d => d.id !== id && d.data().tipo === u.cambios.tipo);
      if (choque) throw new Error(`Ya existe ${u.cambios.tipo}/${slug}`);
    }
  }

  const aBorrar = snap.docs.find(d => d.id === DOC_A_BORRAR);
  if (aBorrar) {
    const p = aBorrar.data();
    filas.push([`${p.slug} (doc ${DOC_A_BORRAR})`, '(documento)', `${p.subtitulo} • precioAnterior ${p.precioAnterior}`, '(borrado)']);
  }

  console.log(['Producto (slug)', 'Campo', 'Antes', 'Después'].join(' | '));
  for (const f of filas) console.log(f.join(' | '));
  console.log('\nAnillos con tallas especiales (sin cambio de talla):');
  for (const e of especiales) console.log(`  ${e}`);

  if (!APLICAR) {
    console.log(`\nModo prueba: no se escribió nada. ${updates.size} documentos cambiarían y ${aBorrar ? 1 : 0} se borraría. Usa --aplicar para escribir.`);
    return;
  }
  const batch = db.batch();
  for (const u of updates.values()) batch.update(u.ref, u.cambios);
  if (aBorrar) batch.delete(aBorrar.ref);
  await batch.commit();
  console.log(`\n✅ ${updates.size} documentos actualizados${aBorrar ? ' y 1 borrado' : ''}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
