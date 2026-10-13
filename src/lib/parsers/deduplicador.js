/**
 * deduplicador.js
 * Genera huellas digitales de transacciones y verifica duplicados contra movimientos existentes.
 */

export function generarHashTransaccion({ fecha, monto, descripcion, refId }) {
  const f = (fecha || '').trim();
  const m = Number(monto || 0).toFixed(2);
  const d = (descripcion || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 30);
  const r = (refId || '').trim();

  return `${f}_${m}_${r || d}`;
}

/**
 * Revisa si una transacción ya existe en el listado de movimientos de GesHogar.
 */
export function esMovimientoDuplicado(transaccion, movimientosExistentes = []) {
  const hash = generarHashTransaccion(transaccion);

  return movimientosExistentes.some(m => {
    // Coincidencia exacta por hash si fue importado
    if (m.transaccionHash && m.transaccionHash === hash) return true;

    // Coincidencia por refId si existe
    if (transaccion.refId && m.referencia && m.referencia === transaccion.refId) return true;

    // Coincidencia heurística: misma fecha, mismo monto exacto y descripción idéntica o muy parecida
    const mismaFecha = m.fecha === transaccion.fecha;
    const mismoMonto = Math.abs(Number(m.monto || 0) - Number(transaccion.monto || 0)) < 0.01;
    if (mismaFecha && mismoMonto) {
      const d1 = (m.descripcion || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const d2 = (transaccion.descripcion || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (d1 === d2 || (d1.length > 5 && (d1.includes(d2) || d2.includes(d1)))) {
        return true;
      }
    }

    return false;
  });
}
