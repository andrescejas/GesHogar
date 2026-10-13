/**
 * santanderParser.js
 * Parser para extractos exportados desde Banco Santander (.xlsx / .xls / .csv)
 */
import * as XLSX from 'xlsx';
import { parsearMontoMoneda } from './utils.js';

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

    // 1. Omitir rendimientos e intereses por saldo
    if (descLower.includes('interes por saldo') || descLower.includes('rendimiento')) {
      continue;
    }

    // 2. Omitir transferencias recibidas o enviadas de/hacia cuentas propias (mismo titular / hogar)
    const esTransferenciaPropia = 
      descLower.includes('justo jose andres cejas') ||
      descLower.includes('justo jose andres ceja') ||
      descLower.includes('cejas justo jose andres') ||
      descLower.includes('maurizi cecilia soleda') ||
      descLower.includes('maurizi cecilia soledad') ||
      descLower.includes('27299691948') || // CUIT Cecilia (27-29969194-8)
      descLower.includes('1980001730000001048879'); // CBU Bancor Cecilia (Transferencias sistema MEP)

    if (esTransferenciaPropia) {
      continue;
    }

    const esPagoTarjeta = descLower.includes('pago de tarjeta de credito');
    const esSuscripcionFondo = descLower.includes('suscripcion fondos comunes');
    const esDebitoAuto = descLower.includes('deb.aut') || descLower.includes('debito automatico') || descLower.includes('debito directo');

    let contabiliza = true;
    let etiquetaEspecial = '';

    if (esPagoTarjeta) {
      contabiliza = false;
      etiquetaEspecial = 'Pago Tarjeta (No computa)';
    } else if (esSuscripcionFondo) {
      contabiliza = false;
      etiquetaEspecial = 'Fondo Común (Inversión)';
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
      tipo: esEgreso ? 'egreso' : 'ingreso',
      medioPago: esEgreso ? 'Cuenta Bancaria' : 'Transferencia',
      tarjeta: tSantander?.id || 'santander_cuenta',
      responsable: config.responsableDefault || 'Andres',
      estado: 'pagado',
      refId,
      contabiliza,
      etiquetaEspecial,
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

  return items;
}
