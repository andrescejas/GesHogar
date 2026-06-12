import { collection, doc, getDocs, query, updateDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase.js';

const args = new Set(process.argv.slice(2));
const applyChanges = args.has('--apply');

const MONTH_SUFFIX_REGEX = / - [a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]+ de \d{4}[)]$/i;
const CUOTA_GENERADA_REGEX = /^(.*)\s+\((Cuota\s+(?:\d+\s*\/\s*\d+|[^)]*nica))[)]$/i;

function formatearMes(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}

function normalizarEspacios(texto) {
  return texto.replace(/\s+/g, ' ').trim();
}

function crearDescripcionActualizada(movimiento) {
  if (movimiento.esCuota !== true) return null;
  if (!movimiento.fecha || !movimiento.descripcion) return null;
  if (MONTH_SUFFIX_REGEX.test(movimiento.descripcion)) return null;

  const match = movimiento.descripcion.match(CUOTA_GENERADA_REGEX);
  if (!match) return null;

  const descripcionBase = normalizarEspacios(match[1]);
  const textoCuota = normalizarEspacios(match[2]);
  const mes = formatearMes(movimiento.fecha);

  return `${descripcionBase} (${textoCuota} - ${mes})`;
}

async function run() {
  console.log(applyChanges
    ? 'Actualizando descripciones de cuotas existentes...'
    : 'Simulando actualizacion de descripciones de cuotas existentes...'
  );

  const snapshot = await getDocs(query(collection(db, 'movimientos')));
  const cambios = [];
  let cuotas = 0;
  let yaActualizadas = 0;
  let omitidas = 0;

  for (const movimientoDoc of snapshot.docs) {
    const movimiento = { id: movimientoDoc.id, ...movimientoDoc.data() };
    if (movimiento.esCuota !== true) continue;

    cuotas++;

    if (movimiento.descripcion && MONTH_SUFFIX_REGEX.test(movimiento.descripcion)) {
      yaActualizadas++;
      continue;
    }

    const descripcion = crearDescripcionActualizada(movimiento);
    if (!descripcion) {
      omitidas++;
      continue;
    }

    cambios.push({
      id: movimiento.id,
      fecha: movimiento.fecha,
      antes: movimiento.descripcion,
      despues: descripcion,
    });
  }

  console.log(`\nCuotas encontradas: ${cuotas}`);
  console.log(`Candidatas a actualizar: ${cambios.length}`);
  console.log(`Ya actualizadas: ${yaActualizadas}`);
  console.log(`Omitidas por formato no reconocido: ${omitidas}`);

  if (cambios.length > 0) {
    console.log('\nPrimeros cambios:');
    for (const cambio of cambios.slice(0, 20)) {
      console.log(`- ${cambio.id} | ${cambio.fecha}`);
      console.log(`  antes:   ${cambio.antes}`);
      console.log(`  despues: ${cambio.despues}`);
    }

    if (cambios.length > 20) {
      console.log(`\n...y ${cambios.length - 20} cambios mas.`);
    }
  }

  if (!applyChanges) {
    console.log('\nNo se escribio ningun cambio. Ejecuta con --apply para aplicar.');
    return;
  }

  for (const cambio of cambios) {
    await updateDoc(doc(db, 'movimientos', cambio.id), {
      descripcion: cambio.despues,
    });
  }

  console.log(`\nListo. Se actualizaron ${cambios.length} cuotas.`);
}

run().catch((error) => {
  console.error('\nError actualizando cuotas:', error);
  process.exit(1);
});
