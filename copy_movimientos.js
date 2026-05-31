import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase.js';

async function run() {
  console.log("Iniciando copia de movimientos de mayo (2026-05) a abril (2026-04)...");
  
  // Obtenemos todos y filtramos en memoria por simplicidad y porque la fecha es un string 'YYYY-MM-DD'
  const q = query(collection(db, 'movimientos'));
  const snapshot = await getDocs(q);
  
  const movsMayo = snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter(m => m.fecha && m.fecha.startsWith('2026-05'));
  
  if (movsMayo.length === 0) {
    console.log("No hay movimientos en 2026-05 para copiar.");
    process.exit(0);
  }

  let count = 0;
  for (const mov of movsMayo) {
    // Reemplazar 2026-05 por 2026-04 en la fecha
    const nuevaFecha = mov.fecha.replace('2026-05', '2026-04');
    
    // Clonar la data sin el id original
    const data = { ...mov };
    delete data.id;
    const newData = { ...data, fecha: nuevaFecha };
    
    await addDoc(collection(db, 'movimientos'), newData);
    count++;
  }
  
  console.log(`Copia finalizada. Se insertaron ${count} movimientos para 2026-04.`);
  process.exit(0);
}

run().catch(console.error);
