// Script de migracion de un solo uso: agrega "genero" a todos los productos
// y reemplaza "categoria" por "tipo" (reclasificando los que quedaron mal
// bucketed bajo categoria=dama en la migracion original).
//
// Uso: GOOGLE_APPLICATION_CREDENTIALS="ruta/a/tu-clave.json" node scripts/migrar-tipo-genero.mjs
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

// Reclasificacion manual de los documentos que quedaron con categoria=dama
// en la migracion original (eran en realidad anillos/aretes/charms/juegos/
// manillas, no una categoria propia).
const TIPO_CORREGIDO = {
  'dama-anillo-corazon-blanco-pandora': 'anillos',
  'dama-anillo-de-blanca-nieves-pandora': 'anillos',
  'dama-anillo-de-la-bella-y-la-bestia-pandora': 'anillos',
  'dama-anillo-evangeline-pandora': 'anillos',
  'dama-aretes-piedra-de-corazon-pandora': 'aretes',
  'dama-charm-stitch-pandora': 'charms',
  'dama-juego-aretes-y-collar-corazon-blanco-pandora': 'juegos',
  'dama-manilla-pandora-con-charms-rodio': 'manillas',
  'dama-manilla-pandora-con-charms-rodio-variante-2': 'manillas',
  'dama-pulsera-tejido-serpiente-broche-de-corazon-pandora': 'manillas',
};

async function main() {
  const snap = await db.collection('productos').get();
  let actualizados = 0;
  let renombrados = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const tipo = TIPO_CORREGIDO[docSnap.id] || data.categoria || data.tipo;
    if (!tipo) {
      console.warn(`⚠️  ${docSnap.id}: no se pudo determinar el tipo, se omite.`);
      continue;
    }

    const { categoria, ...resto } = data;
    const nuevoDoc = { ...resto, tipo, genero: data.genero || 'dama' };
    const nuevoId = `${tipo}-${data.slug}`;

    await db.collection('productos').doc(nuevoId).set(nuevoDoc);
    actualizados++;

    if (nuevoId !== docSnap.id) {
      await db.collection('productos').doc(docSnap.id).delete();
      renombrados++;
      console.log(`✅ ${docSnap.id} -> ${nuevoId} (tipo=${tipo})`);
    } else {
      console.log(`✅ ${docSnap.id} (tipo=${tipo}, genero=dama)`);
    }
  }

  console.log(`\nActualizados: ${actualizados}. Documentos renombrados: ${renombrados}.`);
}

main();
