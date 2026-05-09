/**
 * Script: copy_projections.js
 * Copia proyecciones de 2026-05 a 2026-04 usando la API REST de Firestore.
 * Respeta categoriaId, subcategoriaId y todos los campos originales.
 */

const PROJECT_ID = 'geshogar-45e9f';
const API_KEY = 'AIzaSyDGyJrDLiCyt2e0MrVBy85Izdd90sKkuRA';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const MES_ORIGEN  = '2026-05';
const MES_DESTINO = '2026-04';

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
    if (v.stringValue  !== undefined) obj[k] = v.stringValue;
    else if (v.doubleValue  !== undefined) obj[k] = v.doubleValue;
    else if (v.integerValue !== undefined) obj[k] = Number(v.integerValue);
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else obj[k] = null;
  }
  return obj;
}

async function firestoreGet(path) {
  const res = await fetch(`${BASE_URL}/${path}?key=${API_KEY}`);
  return res.json();
}

async function firestoreQuery(collection, field, value) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: { stringValue: value }
        }
      }
    }
  };
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  return res.json();
}

async function firestoreDelete(docName) {
  await fetch(`https://firestore.googleapis.com/v1/${docName}?key=${API_KEY}`, { method: 'DELETE' });
}

async function firestoreInsert(collection, data) {
  const res = await fetch(
    `${BASE_URL}/${collection}?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toFirestore(data)) }
  );
  return res.json();
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n=== Copiando Proyecciones: ${MES_ORIGEN} → ${MES_DESTINO} ===\n`);

  // 1. Leer proyecciones del mes ORIGEN
  console.log(`Leyendo proyecciones de ${MES_ORIGEN}...`);
  const origen = await firestoreQuery('proyecciones', 'mes', MES_ORIGEN);
  const docs = origen.filter(r => r.document).map(r => ({
    name: r.document.name,
    data: fromFirestore(r.document)
  }));
  console.log(`  → Encontrados: ${docs.length} registros`);

  if (docs.length === 0) {
    console.log('Nada que copiar.');
    process.exit(0);
  }

  // 2. Eliminar proyecciones existentes en el mes DESTINO
  console.log(`\nEliminando proyecciones existentes en ${MES_DESTINO}...`);
  const existentes = await firestoreQuery('proyecciones', 'mes', MES_DESTINO);
  const existDocs = existentes.filter(r => r.document);
  for (const r of existDocs) {
    await firestoreDelete(r.document.name);
  }
  console.log(`  → Eliminados: ${existDocs.length} registros`);

  // 3. Insertar copias con el mes DESTINO (respetando categoriaId y subcategoriaId)
  console.log(`\nInsertando copias en ${MES_DESTINO}...`);
  let count = 0;
  for (const { data } of docs) {
    const nueva = { ...data, mes: MES_DESTINO };
    await firestoreInsert('proyecciones', nueva);
    count++;
    process.stdout.write(`\r  → Insertados: ${count}/${docs.length}`);
  }

  console.log(`\n\n✓ Listo. ${count} proyecciones copiadas de ${MES_ORIGEN} a ${MES_DESTINO}.\n`);
  process.exit(0);
}

run().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
