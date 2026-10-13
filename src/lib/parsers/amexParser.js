/**
 * amexParser.js
 * Parser para extractos y resúmenes de Tarjeta American Express Crédito (.xlsx) de Santander
 */
import * as XLSX from 'xlsx';
import { parsearMontoMoneda } from './utils.js';

export function parsearAmexFile(dataBufferOrString, config = {}) {
  const workbook = XLSX.read(dataBufferOrString, { type: typeof dataBufferOrString === 'string' ? 'string' : 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let fechaCierre = '2026-10-01';
  let fechaVencimiento = '2026-10-15';

  // 1. Extraer fechas de cierre y vencimiento
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const r = rows[i];
    if (!r) continue;
    if (String(r[0] || '').toLowerCase().includes('fecha de cierre')) {
      const nextRow = rows[i + 1];
      if (nextRow) {
        if (nextRow[0]) {
          const m = String(nextRow[0]).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) fechaCierre = `${m[3]}-${m[2]}-${m[1]}`;
        }
        if (nextRow[1]) {
          const m = String(nextRow[1]).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) fechaVencimiento = `${m[3]}-${m[2]}-${m[1]}`;
        }
      }
    }
  }

  // 2. Determinar el mes liquidado principal por este resumen
  // Si cierra en los primeros días del mes (ej: 01/10/2026), el período liquidado es el mes anterior (2026-09).
  const [cierreY, cierreM, cierreD] = fechaCierre.split('-').map(Number);
  let mesLiquidacionStr = '';
  let ultimoDiaMesLiquidacion = '';

  if (cierreD <= 5) {
    const prevDate = new Date(cierreY, cierreM - 2, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    mesLiquidacionStr = `${y}-${m}`;
    const lastD = new Date(y, prevDate.getMonth() + 1, 0).getDate();
    ultimoDiaMesLiquidacion = `${y}-${m}-${String(lastD).padStart(2, '0')}`;
  } else {
    mesLiquidacionStr = `${cierreY}-${String(cierreM).padStart(2, '0')}`;
    const lastD = new Date(cierreY, cierreM, 0).getDate();
    ultimoDiaMesLiquidacion = `${cierreY}-${String(cierreM).padStart(2, '0')}-${String(lastD).padStart(2, '0')}`;
  }

  // Buscar tarjeta Amex en config.tarjetas si está disponible
  const amexTarjetaId = config.tarjetaId || 
    (config.tarjetas || []).find(t => 
      t.nombre?.toLowerCase().includes('american') || 
      t.nombre?.toLowerCase().includes('amex')
    )?.id || '';

  const items = [];
  let leyendoConsumos = false;
  let ultimaFechaValida = ultimoDiaMesLiquidacion;

  // 3. Extraer consumos
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const col0 = String(r[0] || '').trim();

    if (col0.toLowerCase().includes('tarjeta de') && (col0.toLowerCase().includes('american express') || col0.toLowerCase().includes('amex'))) {
      leyendoConsumos = true;
      continue;
    }
    if (leyendoConsumos && (col0.toLowerCase().startsWith('total de american express') || col0.toLowerCase().startsWith('total de amex'))) {
      leyendoConsumos = false;
      continue;
    }
    if (leyendoConsumos && col0.toLowerCase() === 'fecha') {
      continue;
    }

    if (leyendoConsumos) {
      let fechaCompraOriginal = ultimaFechaValida;
      if (r[0]) {
        const m = String(r[0]).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) {
          fechaCompraOriginal = `${m[3]}-${m[2]}-${m[1]}`;
          ultimaFechaValida = fechaCompraOriginal;
        }
      }

      const desc = String(r[1] || '').trim();
      const cuotas = String(r[2] || '').trim();
      const comp = String(r[3] || '').trim();
      const montoPesos = parsearMontoMoneda(r[4]);
      const montoDolares = parsearMontoMoneda(r[5]);

      if (!montoPesos && !montoDolares) continue;

      const esMesLiquidado = fechaCompraOriginal.startsWith(mesLiquidacionStr);
      const fechaImputacion = esMesLiquidado ? fechaCompraOriginal : ultimoDiaMesLiquidacion;

      // Cotización de referencia para consumos en USD (oficial minorista del mes)
      const TIPO_CAMBIO_REF_USD = config.tipoCambioUsd || 1010;
      const esConsumoUsd = !montoPesos && montoDolares > 0;
      const montoFinal = esConsumoUsd 
        ? Math.round(montoDolares * TIPO_CAMBIO_REF_USD * 100) / 100 
        : montoPesos;

      let descripcionFinal = desc;
      if (cuotas) {
        if (!esMesLiquidado) {
          const [fy, fm, fd] = fechaCompraOriginal.split('-');
          descripcionFinal = `${desc} (${cuotas} - compra ${fd}/${fm}/${fy})`;
        } else {
          descripcionFinal = `${desc} (${cuotas})`;
        }
      }

      const refId = comp ? comp.replace(/\*/g, '') : `${i}`;

      items.push({
        idTemp: `amex_${refId}_${fechaImputacion}`,
        fecha: fechaImputacion,
        fechaCompraOriginal,
        fechaVencimiento,
        fechaCierre,
        descripcion: descripcionFinal,
        monto: montoFinal,
        montoOriginalUsd: esConsumoUsd ? montoDolares : null,
        moneda: 'ARS',
        tipo: 'egreso',
        medioPago: 'Crédito',
        tarjeta: amexTarjetaId,
        responsable: config.responsableDefault || 'Andres',
        estado: 'pagado',
        refId,
        cuotas,
        contabiliza: true,
        etiquetaEspecial: cuotas ? `Cuota ${cuotas}` : (esConsumoUsd ? `Conv. U$S ${montoDolares}` : ''),
        origen: 'American Express Santander (8448)'
      });
    }
  }

  // 4. Extraer Otros conceptos (Impuestos, sellos, percepciones)
  let leyendoOtros = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const col0 = String(r[0] || '').trim();

    if (col0.toLowerCase().includes('otros conceptos')) {
      leyendoOtros = true;
      continue;
    }
    if (leyendoOtros && (col0.toLowerCase().startsWith('descripción') || col0.toLowerCase().startsWith('descripcion') || col0.toLowerCase().startsWith('aviso'))) {
      if (col0.toLowerCase().startsWith('aviso')) leyendoOtros = false;
      continue;
    }

    if (leyendoOtros) {
      const desc = col0;
      const monto = parsearMontoMoneda(r[1]);
      if (monto > 0) {
        items.push({
          idTemp: `amex_imp_${i}_${ultimoDiaMesLiquidacion}`,
          fecha: ultimoDiaMesLiquidacion,
          fechaVencimiento,
          fechaCierre,
          descripcion: `Impuestos Tarjeta Amex: ${desc}`,
          monto,
          moneda: 'ARS',
          tipo: 'egreso',
          medioPago: 'Crédito',
          tarjeta: amexTarjetaId,
          responsable: config.responsableDefault || 'Andres',
          estado: 'pagado',
          refId: `imp_${i}`,
          cuotas: '',
          contabiliza: true,
          etiquetaEspecial: 'Impuesto Tarjeta',
          origen: 'American Express Santander (8448)'
        });
      }
    }
  }

  return items;
}
