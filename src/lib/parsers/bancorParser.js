/**
 * bancorParser.js
 * Parser para extractos exportados desde Banco de Córdoba (Bancor) en formato .xls / .xlsx
 */
import * as XLSX from 'xlsx';

function limpiarMontoBancor(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  // Formato: "$70.000,00" -> 70000.00 o "$-333.745,00" -> -333745.00
  const limpio = String(str).replace('$', '').trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(limpio) || 0;
}

/**
 * Parsea un ArrayBuffer de un extracto de Bancor y devuelve movimientos normalizados
 */
export function parsearBancorFile(arrayBuffer, config = {}) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r && r[0] === 'Fecha' && r[1] === 'Concepto') {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error('El archivo no contiene el formato esperado de Bancor (no se encontró la cabecera Fecha/Concepto).');
  }

  const items = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[0]) continue;
    if (String(r[0]).includes('Cantidad de movimientos')) break;

    const fechaStr = String(r[0]).trim();
    // Formato DD/MM/YYYY
    const partesFecha = fechaStr.split('/');
    if (partesFecha.length !== 3) continue;
    const [d, m, y] = partesFecha;
    const fecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    const concepto = r[1] ? String(r[1]).trim() : '';
    const detalle = r[2] ? String(r[2]).trim() : '';
    const descripcion = detalle ? `${concepto} - ${detalle}` : concepto;

    const montoRaw = r[3];
    const valorNumerico = limpiarMontoBancor(montoRaw);
    if (isNaN(valorNumerico) || valorNumerico === 0) continue;

    const esEgreso = valorNumerico < 0;
    const monto = Math.abs(valorNumerico);

    const comprobante = r[4] ? String(r[4]).trim() : '';
    const refId = comprobante && comprobante !== '0' ? comprobante : `${i}`;

    // Reglas de negocio para Bancor
    const descUpper = descripcion.toUpperCase();
    const esPagoTarjeta = descUpper.includes('TARJETA CORDOBESA') || descUpper.includes('TARJ.CORDOBESA');
    const esRendimiento = descUpper.includes('INTERES POR CAPITALIZACION') || descUpper.includes('CAPITALIZACION');
    const esDebinBilletera = descUpper.includes('DEBIN') && (descUpper.includes('MERCADOLIBRE') || descUpper.includes('NARANJA'));
    const esDebitoAuto = descUpper.includes('DEB.AUT') || descUpper.includes('DEBITO AUTOMATICO') || descUpper.includes('DEBITO DIRECTO');

    let contabiliza = true;
    let etiquetaEspecial = '';
    let alertaImportacion = '';

    if (esPagoTarjeta) {
      contabiliza = false;
      etiquetaEspecial = 'Pago Tarjeta Cordobesa';
    } else if (esRendimiento) {
      etiquetaEspecial = 'Rendimiento Bancor';
    } else if (esDebitoAuto) {
      etiquetaEspecial = 'Débito Automático';
    } else if (esDebinBilletera) {
      alertaImportacion = 'Posible débito hacia billetera virtual (fondeo)';
    }

    const tBancor = config.tarjetas?.find(t => t.nombre?.toLowerCase().includes('bancor'));

    items.push({
      idTemp: `bancor_${refId}_${fecha}`,
      fecha,
      descripcion,
      monto,
      tipo: esEgreso ? 'egreso' : 'ingreso',
      medioPago: esEgreso ? 'Cuenta Bancaria' : 'Transferencia',
      tarjeta: tBancor?.id || 'bancor',
      responsable: config.responsableDefault || 'Cecilia',
      estado: 'pagado',
      refId,
      contabiliza,
      etiquetaEspecial,
      alertaImportacion,
      origen: 'Banco de Córdoba (Bancor)'
    });
  }

  return items;
}
