import { db } from '../src/lib/firebase.js';
import { collection, getDocs, query, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  console.log('Iniciando proceso para septiembre 2026...');

  // 1. Obtener movimientos de septiembre
  const snap = await getDocs(query(collection(db, 'movimientos')));
  const sepMovs = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(m => m.fecha && m.fecha.startsWith('2026-09'));

  console.log(`Encontrados ${sepMovs.length} movimientos en septiembre 2026.`);

  if (sepMovs.length === 0) {
    console.log('No hay movimientos en septiembre 2026 para borrar.');
    process.exit(0);
  }

  // 2. Guardar backup preventivo
  const backupPath = 'd:/MisProyectos/GesHogar/backups/backup_septiembre_2026.json';
  fs.writeFileSync(backupPath, JSON.stringify(sepMovs, null, 2), 'utf8');
  console.log(`✓ Backup guardado exitosamente en: ${backupPath}`);

  // 3. Eliminar documentos
  let eliminados = 0;
  for (const mov of sepMovs) {
    await deleteDoc(doc(db, 'movimientos', mov.id));
    eliminados++;
    process.stdout.write(`\rEliminando: ${eliminados}/${sepMovs.length}`);
  }

  console.log(`\n✓ Finalizado con éxito. Se eliminaron ${eliminados} movimientos de septiembre 2026.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
