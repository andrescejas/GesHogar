/**
 * santanderParser.js
 * Parser para extractos exportados desde Banco Santander (.xlsx / .xls / .csv)
 */
import * as XLSX from 'xlsx';
import { parsearMontoMoneda, consolidarRendimientos } from './utils.js';

export function parsearSantanderFile(dataBufferOrString, config = {}) {
  const workbook = XLSX.read(dataBufferOrString, { type: typeof dataBufferOrString === 'string' ? 'string' : 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let headerRowIndex = -1;
  let colFecha = 1;
  let colDesc = 3;
  let colRef = 4;
  let colCajaAhorro = 5;
  let colCuentaCte = 6;

  // Localizar la fila de encabezados
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').toLowerCase();
      if (cell.includes('fecha')) colFecha = c;
      if (cell.includes('descripción') || cell.includes('descripcion')) colDesc = c;
      if (cell.includes('referencia')) colRef = c;
      if (cell.includes('caja de ahorro')) colCajaAhorro = c;
      if (cell.includes('cuenta corriente')) colCuentaCte = c;
    }

    if (row.some(val => String(val || '').toLowerCase().includes('descripción') || String(val || '').toLowerCase().includes('descripcion'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('No se encontraron los encabezados esperados en el archivo de Santander.');
  }

  const items = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[colFecha]) continue;

    const fechaRaw = String(row[colFecha]).trim();
    const matchFecha = fechaRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!matchFecha) continue;
    const fecha = `${matchFecha[3]}-${matchFecha[2]}-${matchFecha[1]}`;

    const descRaw = String(row[colDesc] || '')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const refId = String(row[colRef] || '').trim();

    // Importe
    const montoRaw = row[colCajaAhorro] !== undefined && row[colCajaAhorro] !== ''
      ? row[colCajaAhorro]
      : row[colCuentaCte];

    const valorNumerico = parsearMontoMoneda(montoRaw);
    if (!valorNumerico || isNaN(valorNumerico) || valorNumerico === 0) continue;

    const esEgreso = valorNumerico < 0;
    const montoAbs = Math.abs(valorNumerico);
    const descLower = descRaw.toLowerCase();

    // Heurísticas de clasificación y movimientos no computables
    const esRendimiento = descLower.includes('interes por saldo') || descLower.includes('rendimiento');
    const esPagoTarjeta = descLower.includes('pago de tarjeta de credito');
    const esSuscripcionFondo = descLower.includes('suscripcion fondos comunes');
    const esDebitoAuto = descLower.includes('deb.aut') || descLower.includes('debito automatico') || descLower.includes('debito directo');

    // Transferencias internas entre cuentas propias o miembros del hogar
    const esTransferenciaPropia = 
      descLower.includes('justo jose andres') ||
      descLower.includes('cejas justo jose') ||
      descLower.includes('20260855833') || // CUIT Andrés
      descLower.includes('maurizi cecilia') ||
      descLower.includes('cecilia soledad maurizi') ||
      descLower.includes('27299691948') || // CUIT Cecilia
      descLower.includes('a su cta. mercado pago') ||
      descLower.includes('cvu mismo titular');

    let contabiliza = true;
    let etiquetaEspecial = '';
    let alertaImportacion = '';
    let comentario = '';

    if (esRendimiento) {
      contabiliza = true;
      etiquetaEspecial = 'Rendimiento Bancario';
    } else if (esPagoTarjeta) {
      contabiliza = false;
      etiquetaEspecial = 'Pago Tarjeta (No computa)';
      alertaImportacion = 'NO TILDAR: Los gastos ya se importan con el resumen de la tarjeta para no duplicar';
      comentario = 'Pago de tarjeta (No tildar: los consumos reales se importan desde el resumen de Visa/Amex)';
    } else if (esSuscripcionFondo) {
      contabiliza = false;
      etiquetaEspecial = 'Fondo Común (Inversión)';
      alertaImportacion = 'NO TILDAR: Suscripción a fondo de inversión (movimiento patrimonial neutro)';
      comentario = 'Inversión en FCI (no computa como gasto de consumo)';
    } else if (esTransferenciaPropia) {
      contabiliza = false;
      etiquetaEspecial = 'Movimiento Interno';
      alertaImportacion = 'NO TILDAR: Transferencia entre cuentas del hogar';
      comentario = 'Transferencia interna propia (no computa como gasto para no duplicar)';
    } else if (esDebitoAuto) {
      etiquetaEspecial = 'Débito Automático';
    }

    const tSantander = config.tarjetas?.find(t => 
      t.nombre?.toLowerCase().includes('santander') && 
      !t.nombre?.toLowerCase().includes('visa') && 
      !t.nombre?.toLowerCase().includes('amex')
    );

    items.push({
      idTemp: `san_${refId || i}_${fecha}`,
      fecha,
      descripcion: descRaw,
      monto: montoAbs,
      tipo: esRendimiento ? 'ingreso' : (esEgreso ? 'egreso' : 'ingreso'),
      medioPago: esEgreso ? 'Cuenta Bancaria' : 'Transferencia',
      tarjeta: tSantander?.id || 'santander_cuenta',
      responsable: config.responsableDefault || 'Andres',
      estado: 'pagado',
      refId,
      contabiliza,
      etiquetaEspecial,
      alertaImportacion,
      comentario,
      esRendimiento,
      origen: 'Banco Santander',
      esPagoTarjeta
    });
  }

  // 3. Compensar anulaciones de promociones y bonificaciones duplicadas por reajustes bancarios
  const anulaciones = items.filter(it => it.descripcion.toLowerCase().includes('anulacion promocion'));
  for (const anul of anulaciones) {
    const idxAnul = items.indexOf(anul);
    if (idxAnul !== -1) items.splice(idxAnul, 1);
    const idxBonif = items.findIndex(it => 
      it.descripcion.toLowerCase().includes('bonificacion promocion') && 
      Math.abs(it.monto - anul.monto) < 0.01
    );
    if (idxBonif !== -1) items.splice(idxBonif, 1);
  }

  return consolidarRendimientos(items, config.responsableDefault || 'Andres', 'Banco Santander');
}
