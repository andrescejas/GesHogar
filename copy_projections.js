import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase.js';

async function run() {
  console.log("Iniciando copia de proyecciones de 2026-05 a 2026-04...");
  const q = query(collection(db, 'proyecciones'), where('mes', '==', '2026-05'));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log("No hay proyecciones en 2026-05 para copiar.");
    process.exit(0);
  }

  let count = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    // Excluir el ID viejo, solo copiamos la data
    const newData = { ...data, mes: '2026-04' };
    await addDoc(collection(db, 'proyecciones'), newData);
    count++;
  }
  
  console.log(`Copia finalizada. Se insertaron ${count} proyecciones para 2026-04.`);
  process.exit(0);
}

run().catch(console.error);
