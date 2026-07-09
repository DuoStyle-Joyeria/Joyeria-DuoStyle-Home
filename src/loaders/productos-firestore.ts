import type { Loader } from 'astro/loaders';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function obtenerFirestore() {
  if (getApps().length === 0) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Modo desarrollo/prueba local contra el emulador de Firebase: no requiere
      // credenciales reales. Se activa solo si esa variable está definida.
      initializeApp({ projectId: 'demo-duostyle' });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Vercel (o cualquier entorno sin acceso a archivos locales): el JSON
      // completo de la service account pegado como variable de entorno.
      initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Desarrollo local: ruta a el archivo .json descargado desde Firebase
      // Console, sin necesidad de pegar su contenido en ningún lado.
      initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
    } else {
      throw new Error(
        'Falta FIREBASE_SERVICE_ACCOUNT_KEY o GOOGLE_APPLICATION_CREDENTIALS para leer el catálogo en build time.'
      );
    }
  }
  return getFirestore();
}

export function productosFirestoreLoader(): Loader {
  return {
    name: 'productos-firestore',
    load: async ({ store, parseData, logger }) => {
      const db = obtenerFirestore();
      const snap = await db.collection('productos').get();
      store.clear();
      for (const doc of snap.docs) {
        const parsed = await parseData({ id: doc.id, data: doc.data() });
        store.set({ id: doc.id, data: parsed });
      }
      logger.info(`Cargados ${snap.size} productos desde Firestore`);
    },
  };
}
