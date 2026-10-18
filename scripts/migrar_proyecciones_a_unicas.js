/**
 * migrar_proyecciones_a_unicas.js
 * 
 * 1. Asegura que las 14 proyecciones recurrentes históricas que aplicaban a 2026-10
 *    tengan su documento propio en 2026-10 con frecuencia: 'Única'.
 * 2. Actualiza TODAS las proyecciones recurrentes en Firestore a frecuencia: 'Única'.
 * 3. Verifica que en 2026-11 y adelante no quede ninguna proyección.
 */

const PROJECT_ID = 'geshogar-45e9f';
const API_KEY = 'AIzaSyDGyJrDLiCyt2e0MrVBy85Izdd90sKkuRA';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFirestore(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = { doubleValue: v };
    } else {
      fields[k] = { stringValue: String(v) };
    }
  }
  return { fields };
}

function fromFirestore(doc) {
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
    else if (v.integerValue !== undefined) obj[k] = Number(v.integerValue);
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else obj[k] = null;
  }
  return obj;
}

async function run() {
  console.log('=== Iniciando migración a modelo de copia mensual (Frecuencia: Única) ===\n');

  // 1. Obtener todas las proyecciones
  const res = await fetch(`${BASE_URL}/proyecciones?key=${API_KEY}&pageSize=300`);
  const data = await res.json();
  const allDocs = data.documents.map(d => ({
    name: d.name,
    id: d.name.split('/').pop(),
    raw: d,
    data: fromFirestore(d)
  }));

  console.log(`Total documentos en proyecciones: ${allDocs.length}`);

  // 2. Verificar y eliminar si hubiera proyecciones >= 2026-11
  const futureDocs = allDocs.filter(d => (d.data.mes || '') >= '2026-11');
  if (futureDocs.length > 0) {
    console.log(`Eliminando ${futureDocs.length} proyecciones de meses >= 2026-11...`);
    for (const d of futureDocs) {
      await fetch(`https://firestore.googleapis.com/v1/${d.name}?key=${API_KEY}`, { method: 'DELETE' });
    }
    console.log('✓ Proyecciones futuras eliminadas.');
  } else {
    console.log('✓ No existen proyecciones físicas guardadas para >= 2026-11.');
  }

  // 3. Proyecciones recurrentes con mes anterior que aplicaban a 2026-10
  const olderActiveInOct = allDocs.filter(d => {
    if ((d.data.frecuencia || 'Única') === 'Única') return false;
    const mes = d.data.mes;
    if (mes === '2026-10') return false;
    const inicio = d.data.fechaInicio || mes;
    const fin = d.data.fechaFin;
    if ('2026-10' < inicio.substring(0, 7)) return false;
    if (fin && '2026-10' > fin.substring(0, 7)) return false;
    return true;
  });

  console.log(`\nInsertando en 2026-10 las ${olderActiveInOct.length} proyecciones que venían del pasado...`);
  for (const d of olderActiveInOct) {
    const copyData = {
      ...d.data,
      mes: '2026-10',
      frecuencia: 'Única',
      fechaInicio: '',
      fechaFin: '',
      generarMovimientos: false
    };
    // Asegurar que montoProyectado sea number
    if (copyData.montoProyectado !== undefined && copyData.montoProyectado !== null) {
      copyData.montoProyectado = Number(copyData.montoProyectado);
    } else if (copyData.monto) {
      copyData.montoProyectado = Number(copyData.monto);
    }

    const insertRes = await fetch(`${BASE_URL}/proyecciones?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFirestore(copyData))
    });
    const insertJson = await insertRes.json();
    console.log(`  + Creada en 2026-10: ${copyData.descripcion || '(sin desc)'} ($${copyData.montoProyectado}) -> ID ${insertJson.name?.split('/').pop()}`);
  }

  // 4. Actualizar todas las proyecciones recurrentes originales a frecuencia: 'Única'
  const recurrentesOriginales = allDocs.filter(d => (d.data.frecuencia || 'Única') !== 'Única');
  console.log(`\nActualizando ${recurrentesOriginales.length} proyecciones recurrentes a 'Única'...`);
  for (const d of recurrentesOriginales) {
    const patchBody = {
      fields: {
        ...d.raw.fields,
        frecuencia: { stringValue: 'Única' }
      }
    };
    await fetch(`https://firestore.googleapis.com/v1/${d.name}?key=${API_KEY}&updateMask.fieldPaths=frecuencia`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody)
    });
  }
  console.log('✓ Todas las proyecciones pasadas a frecuencia "Única".');

  // 5. Verificación final
  const verifyRes = await fetch(`${BASE_URL}/proyecciones?key=${API_KEY}&pageSize=300`);
  const verifyData = await verifyRes.json();
  const verifyDocs = verifyData.documents.map(d => fromFirestore(d));
  
  const octCount = verifyDocs.filter(d => d.mes === '2026-10').length;
  const novCount = verifyDocs.filter(d => d.mes === '2026-11').length;
  const recCount = verifyDocs.filter(d => (d.frecuencia || 'Única') !== 'Única').length;

  console.log('\n=== Resumen de verificación ===');
  console.log(`Proyecciones en 2026-10: ${octCount} (esperado: 50)`);
  console.log(`Proyecciones en 2026-11: ${novCount} (esperado: 0)`);
  console.log(`Proyecciones recurrentes restantes: ${recCount} (esperado: 0)`);
  console.log('\n✓ Migración completada con éxito.');
}

run().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
