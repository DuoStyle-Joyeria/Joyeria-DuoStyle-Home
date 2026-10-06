// Script de un solo uso: ajustes de datos pedidos antes de publicar el feed
// de WhatsApp (colecciones, manillas con charms y frases de las descripciones).
// No cambia nombres ni slugs (eso cambiaría las URLs de los productos).
//
// Por defecto es solo lectura: muestra la tabla de cambios y no escribe nada.
//   GOOGLE_APPLICATION_CREDENTIALS="ruta/a/tu-clave.json" node scripts/ajustes-feed-meta.mjs
// Para escribir en Firestore:
//   GOOGLE_APPLICATION_CREDENTIALS="ruta/a/tu-clave.json" node scripts/ajustes-feed-meta.mjs --aplicar
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

// Las dos manillas con charms tenían las descripciones invertidas respecto a
// sus fotos: la del doc sin sufijo es gris (rodio) y la variante-2 es dorada.
const MANILLA_RODIO = 'manillas-manilla-pandora-con-charms-rodio';
const MANILLA_DORADA = 'manillas-manilla-pandora-con-charms-rodio-variante-2';

const DESCRIPCION_RODIO =
  'Manilla en rodio gris con charms incluidos ✨ Una pieza sofisticada que refleja distinción y estilo. ' +
  'Su acabado en rodio de tono gris aporta un brillo elegante y moderno, y los charms a juego realzan la joya. ' +
  'Importante: esta manilla es en rodio, no en plata 925. ' +
  'Diseñada para acompañarte en cada momento, es perfecta para llevar sola como protagonista o combinada con otras piezas, ' +
  'dando un aire refinado y único a tu look.';

const CAMBIOS_POR_ID = {
  // Colección fijada a mano (si no, la regla automática los mandaba a Oro Rosa y Dorados).
  'anillos-anillo-corazon-blanco-pandora-variante-2': { coleccion: 'Anillos de Promesa' },
  'anillos-anillo-corazon-rosado-pandora': { coleccion: 'Anillos de Promesa' },
  [MANILLA_RODIO]: {
    tituloMeta: 'Manilla con Charms en Rodio',
    subtitulo: 'Rodio',
    precio: 80000,
    descripcion: DESCRIPCION_RODIO,
  },
  [MANILLA_DORADA]: {
    tituloMeta: 'Manilla Dorada con Charms Plata 925 con Baño de Oro',
    subtitulo: 'Plata 925 con baño de oro',
    // La descripción dorada estaba guardada en el otro documento.
    descripcion: datos => datos.get(MANILLA_RODIO).descripcion,
  },
};

// Frases de las descripciones de la web.
function corregirFrases(texto) {
  return texto
    .replace(/certificado de autenticidad/gi, 'certificado de plata 925')
    .replace(/caja y bolsa estilo Pandora/gi, 'empaque de regalo Duo Style');
}

function resumen(valor) {
  const s = String(valor ?? '(vacío)').replace(/\s+/g, ' ');
  return s.length > 70 ? s.slice(0, 67) + '…' : s;
}

async function main() {
  const snap = await db.collection('productos').get();
  const datos = new Map(snap.docs.map(d => [d.id, d.data()]));

  for (const id of Object.keys(CAMBIOS_POR_ID)) {
    if (!datos.has(id)) throw new Error(`No existe el producto ${id}`);
  }

  const updates = new Map();
  const filas = [];
  for (const doc of snap.docs) {
    const actual = doc.data();
    const cambios = {};
    for (const [campo, valor] of Object.entries(CAMBIOS_POR_ID[doc.id] ?? {})) {
      cambios[campo] = typeof valor === 'function' ? valor(datos) : valor;
    }
    const descripcion = corregirFrases(cambios.descripcion ?? actual.descripcion);
    if (descripcion !== actual.descripcion) cambios.descripcion = descripcion;

    for (const [campo, valor] of Object.entries(cambios)) {
      if (valor === actual[campo]) {
        delete cambios[campo];
        continue;
      }
      filas.push([actual.slug, campo, resumen(actual[campo]), resumen(valor)]);
    }
    if (Object.keys(cambios).length) updates.set(doc.id, { ref: doc.ref, cambios });
  }

  console.log(['Producto (slug)', 'Campo', 'Antes', 'Después'].join(' | '));
  for (const f of filas) console.log(f.join(' | '));

  if (!APLICAR) {
    console.log(`\nModo prueba: no se escribió nada. ${updates.size} documentos cambiarían. Usa --aplicar para escribir.`);
    return;
  }
  const batch = db.batch();
  for (const u of updates.values()) batch.update(u.ref, u.cambios);
  await batch.commit();
  console.log(`\n✅ ${updates.size} documentos actualizados.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
