// Script de migracion de un solo uso: sube los productos existentes en
// src/content/productos/**/*.json a la coleccion "productos" de Firestore.
//
// Opcion A (recomendada, sin pegar el contenido de la clave en ningun lado):
//   guarda el .json de la service account en tu computador (ej. junto a este
//   proyecto, con un nombre que NO se suba a git) y corre:
//   GOOGLE_APPLICATION_CREDENTIALS="C:/ruta/a/tu-clave.json" node scripts/migrar-productos-a-firestore.mjs
//
// Opcion B: variable FIREBASE_SERVICE_ACCOUNT_KEY con el JSON completo en una
// sola linea (la misma que se usa en Vercel), via node --env-file=.env
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'productos');

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
} else {
  console.error(
    'Falta la credencial. Usa GOOGLE_APPLICATION_CREDENTIALS="ruta/a/tu-clave.json" node scripts/migrar-productos-a-firestore.mjs\n' +
    'o FIREBASE_SERVICE_ACCOUNT_KEY con node --env-file=.env'
  );
  process.exit(1);
}

const db = getFirestore();

async function main() {
  const categorias = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let total = 0;
  for (const categoria of categorias) {
    const dir = path.join(CONTENT_DIR, categoria);
    const archivos = readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const archivo of archivos) {
      const data = JSON.parse(readFileSync(path.join(dir, archivo), 'utf-8'));
      const { destacado, ...resto } = data;
      const doc = {
        ...resto,
        secciones: destacado ? ['destacado'] : [],
      };
      const id = `${categoria}-${data.slug}`;
      await db.collection('productos').doc(id).set(doc);
      total++;
      console.log(`✅ ${id}`);
    }
  }
  console.log(`\nMigrados ${total} productos a Firestore.`);
}

main();
