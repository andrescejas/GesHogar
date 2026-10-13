import { db } from '../src/lib/firebase.js';
import { collection, getDocs, query, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

async function run() {
  console.log('Buscando movimientos desde septiembre 2026 en adelante (>= 2026-09-01)...');

  const snap = await getDocs(query(collection(db, 'movimientos')));
  const aLimpiar = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(m => m.fecha && m.fecha >= '2026-09-01');

  console.log(`Encontrados ${aLimpiar.length} movimientos a partir de 2026-09-01.`);

  // Guardar backup preventivo
  const backupPath = 'd:/MisProyectos/GesHogar/backups/backup_septiembre_en_adelante.json';
  fs.writeFileSync(backupPath, JSON.stringify(aLimpiar, null, 2), 'utf8');
  console.log(`✓ Backup preventivo guardado en: ${backupPath}`);

  if (aLimpiar.length === 0) {
    console.log('No hay movimientos para borrar.');
    process.exit(0);
  }

  // Eliminar documentos
  let eliminados = 0;
  for (const mov of aLimpiar) {
    await deleteDoc(doc(db, 'movimientos', mov.id));
    eliminados++;
    process.stdout.write(`\rEliminando: ${eliminados}/${aLimpiar.length}`);
  }

  console.log(`\n✓ Finalizado con éxito. Se eliminaron ${eliminados} movimientos desde septiembre en adelante.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
