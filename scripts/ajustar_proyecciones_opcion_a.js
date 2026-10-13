import { db } from '../src/lib/firebase.js';
import { collection, getDocs, query, updateDoc, doc } from 'firebase/firestore';

async function run() {
  console.log('Ajustando proyecciones a Opción A (generarMovimientos = false)...');
  const snap = await getDocs(query(collection(db, 'proyecciones')));
  const conAuto = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.generarMovimientos === true);

  for (const p of conAuto) {
    await updateDoc(doc(db, 'proyecciones', p.id), { generarMovimientos: false });
    console.log(`✓ Proyección "${p.descripcion || p.id}" actualizada a generarMovimientos: false`);
  }

  console.log(`\n✓ Se actualizaron ${conAuto.length} proyecciones. Ahora son metas presupuestarias puras.`);
  process.exit(0);
}

run().catch(console.error);
