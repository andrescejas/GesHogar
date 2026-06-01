import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../src/lib/firebase.js';

const COLLECTIONS = [
  'categorias',
  'subcategorias',
  'tarjetas',
  'movimientos',
  'proyecciones',
];

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(process.cwd(), 'backups');
const backupFile = join(backupDir, `backup-${timestamp}.json`);

async function readCollection(collectionName) {
  const snapshot = await getDocs(query(collection(db, collectionName)));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

async function run() {
  console.log('Iniciando backup de Firestore...');

  const data = {
    metadata: {
      createdAt: new Date().toISOString(),
      projectId: 'geshogar-45e9f',
      collections: COLLECTIONS,
      format: 'geshogar-firestore-backup-v1',
    },
    data: {},
  };

  for (const collectionName of COLLECTIONS) {
    const docs = await readCollection(collectionName);
    data.data[collectionName] = docs;
    console.log(`- ${collectionName}: ${docs.length} registros`);
  }

  await mkdir(backupDir, { recursive: true });
  await writeFile(backupFile, JSON.stringify(data, null, 2), 'utf8');

  console.log(`\nBackup creado: ${backupFile}`);
  process.exit(0);
}

run().catch((error) => {
  console.error('\nError creando backup:', error);
  process.exit(1);
});
