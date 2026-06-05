/**
 * generadorRecurrentes.js
 * Genera movimientos pendientes para proyecciones recurrentes activas.
 * Ventana: mes actual + 3 meses adelante.
 * Nunca genera duplicados (verifica por proyeccionId + mes).
 */

/**
 * Calcula si una proyección cae en un mes dado según su frecuencia.
 * @param {object} proyeccion
 * @param {string} mesObjetivo - formato "YYYY-MM"
 * @returns {boolean}
 */
export function proyeccionAplicaEnMes(proyeccion, mesObjetivo) {
  const freq = proyeccion.frecuencia || 'Única';
  if (freq === 'Única') return false; // Las únicas no son recurrentes

  const startMonth = proyeccion.fechaInicio
    ? proyeccion.fechaInicio.substring(0, 7)
    : proyeccion.mes;
  const endMonth = proyeccion.fechaFin
    ? proyeccion.fechaFin.substring(0, 7)
    : null;

  if (mesObjetivo < startMonth) return false;
  if (endMonth && mesObjetivo > endMonth) return false;

  const dStart = new Date(startMonth + '-01');
  const dTarget = new Date(mesObjetivo + '-01');
  const diffMonths =
    (dTarget.getFullYear() - dStart.getFullYear()) * 12 +
    (dTarget.getMonth() - dStart.getMonth());

  switch (freq) {
    case 'Mensual':    return true;
    case 'Bimestral':  return diffMonths % 2 === 0;
    case 'Trimestral': return diffMonths % 3 === 0;
    case 'Semestral':  return diffMonths % 6 === 0;
    case 'Anual':      return diffMonths % 12 === 0;
    default:           return false;
  }
}

/**
 * Calcula los meses de la ventana de generación: mes actual + N meses.
 * @param {number} ventana - cuántos meses hacia adelante (default 3)
 * @returns {string[]} array de strings "YYYY-MM"
 */
export function getMesesVentana(ventana = 3) {
  const meses = [];
  const hoy = new Date();
  for (let i = 0; i <= ventana; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    meses.push(`${yyyy}-${mm}`);
  }
  return meses;
}

/**
 * Calcula la fecha del movimiento dentro del mes objetivo respetando el dia
 * elegido en fechaInicio. Si el mes no tiene ese dia, usa el ultimo dia.
 *
 * @param {object} proyeccion
 * @param {string} mesObjetivo - formato "YYYY-MM"
 * @returns {string} fecha en formato "YYYY-MM-DD"
 */
export function getFechaMovimientoEnMes(proyeccion, mesObjetivo) {
  const fechaBase = proyeccion.fechaInicio || `${proyeccion.mes || mesObjetivo}-01`;
  const diaBase = Number(fechaBase.substring(8, 10)) || 1;
  const [year, month] = mesObjetivo.split('-').map(Number);
  const ultimoDiaMes = new Date(year, month, 0).getDate();
  const dia = Math.min(diaBase, ultimoDiaMes);

  return `${mesObjetivo}-${String(dia).padStart(2, '0')}`;
}

/**
 * Genera los movimientos pendientes faltantes para todas las proyecciones
 * recurrentes activas con generarMovimientos === true.
 *
 * @param {object[]} proyecciones - array de proyecciones de Firestore
 * @param {object[]} movimientos  - array de movimientos existentes de Firestore
 * @param {Function} addMovimiento - función async del DataContext
 * @returns {Promise<number>} cantidad de movimientos creados
 */
export async function generarMovimientosRecurrentes(proyecciones, movimientos, addMovimiento) {
  const mesesVentana = getMesesVentana(3);
  let creados = 0;

  const recurrentes = proyecciones.filter(
    p =>
      p.generarMovimientos === true &&
      (p.estado === 'Activa' || p.estado === undefined) &&
      (p.frecuencia || 'Única') !== 'Única'
  );

  for (const proy of recurrentes) {
    for (const mes of mesesVentana) {
      if (!proyeccionAplicaEnMes(proy, mes)) continue;

      // Verificar si ya existe un movimiento para esta proyección en este mes
      const yaExiste = movimientos.some(
        m => m.proyeccionId === proy.id && m.mes === mes
      );

      if (yaExiste) continue;

      // Crear el movimiento pendiente
      await addMovimiento({
        proyeccionId: proy.id,
        fecha: getFechaMovimientoEnMes(proy, mes),
        mes,
        tipo: proy.tipo,
        categoriaId: proy.categoriaId,
        subcategoriaId: proy.subcategoriaId || '',
        descripcion: proy.descripcion || '',
        responsable: proy.responsable || '',
        monto: Number(proy.montoProyectado || 0),
        estado: 'pendiente',
        medioPago: proy.medioPago || 'Efectivo',
        esCuota: false,
        contabiliza: true,
        esRecurrenteAuto: true,
        tarjeta: proy.tarjeta || '',
      });
      creados++;
    }
  }

  return creados;
}
