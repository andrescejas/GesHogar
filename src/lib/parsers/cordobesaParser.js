/**
 * cordobesaParser.js
 * Parser para resúmenes oficiales en PDF de Tarjeta Cordobesa Mastercard (Bancor)
 */
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

const MESES_MAP = {
  ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
  JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12'
};

function limpiarMonto(str) {
  if (!str) return 0;
  const esNegativo = str.includes('-') || str.endsWith('-');
  const limpio = str.replace(/[^\d,]/g, '').replace(',', '.');
  const valor = parseFloat(limpio) || 0;
  return esNegativo ? -valor : valor;
}

export async function parsearCordobesaFile(arrayBuffer, config = {}) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const cordobesaTarjetaId = config.tarjetaId || 'kwFiy445bYVhjbmQQJbv'; // Cordobesa - Cecilia
  const responsable = config.responsableDefault || 'Cecilia';

  const page = await pdf.getPage(1);
  const content = await page.getTextContent();

  // Agrupar items por línea de Y (con tolerancia de 2.5px)
  const lineMap = {};
  content.items.forEach(it => {
    const text = it.str.trim();
    if (!text) return;
    const y = Math.round(it.transform[5]);
    const x = Math.round(it.transform[4]);

    let foundY = Object.keys(lineMap).find(k => Math.abs(Number(k) - y) <= 2.5);
    if (!foundY) {
      foundY = y;
      lineMap[foundY] = [];
    }
    lineMap[foundY].push({ x, text });
  });

  const sortedYs = Object.keys(lineMap).map(Number).sort((a, b) => b - a);

  // 1. Detectar fechas de cierre y vencimiento
  let fechaCierre = '2026-09-24';
  let fechaVencimiento = '2026-10-06';

  for (const y of sortedYs) {
    const lineText = lineMap[y].sort((a, b) => a.x - b.x).map(it => it.text).join(' ');
    const matchCierre = lineText.match(/CIERRE ACTUAL:\s*(\d{2})\s*([A-Z]{3})\s*(\d{2})/i);
    if (matchCierre) {
      const d = matchCierre[1];
      const m = MESES_MAP[matchCierre[2].toUpperCase()] || '09';
      const a = `20${matchCierre[3]}`;
      fechaCierre = `${a}-${m}-${d}`;
    }
    const matchVto = lineText.match(/VENCIMIENTO.*?(\d{2})\s*([A-Z]{3})\s*(\d{2})/i);
    if (matchVto) {
      const d = matchVto[1];
      const m = MESES_MAP[matchVto[2].toUpperCase()] || '10';
      const a = `20${matchVto[3]}`;
      fechaVencimiento = `${a}-${m}-${d}`;
    }
  }

  const mesLiquidado = fechaCierre.substring(0, 7); // ej. '2026-09'
  const [cy, cm] = mesLiquidado.split('-');
  const lastD = new Date(Number(cy), Number(cm), 0).getDate();
  const ultimoDiaMesLiquidacion = `${cy}-${cm}-${String(lastD).padStart(2, '0')}`; // ej. '2026-09-30'

  const items = [];

  for (let i = 0; i < sortedYs.length; i++) {
    const y = sortedYs[i];
    const rowItems = lineMap[y].sort((a, b) => a.x - b.x);
    const lineText = rowItems.map(it => it.text).join(' ');

    // Buscamos líneas que comienzan con una fecha de formato DD.MM.YY
    const dateMatch = lineText.match(/^(\d{2})\.(\d{2})\.(\d{2})\s+(.*)$/);
    if (!dateMatch) continue;

    const dia = dateMatch[1];
    const mes = dateMatch[2];
    const anio = `20${dateMatch[3]}`;
    const fechaCompraOriginal = `${anio}-${mes}-${dia}`;
    const resto = dateMatch[4];

    // Ignorar líneas de totales
    if (lineText.includes('TOTAL') || lineText.includes('SALDO ACTUAL')) continue;

    // Detectar pagos anteriores: "SU PAGO EN PESOS 140.489,00- 0,00"
    if (resto.includes('SU PAGO EN PESOS')) {
      const tokens = resto.split(/\s+/);
      const montoToken = tokens.find(t => t.includes('-'));
      const monto = Math.abs(limpiarMonto(montoToken));
      items.push({
        idTemp: `cordobesa_pago_${items.length}_${fechaCompraOriginal}`,
        fecha: fechaCompraOriginal,
        fechaCompraOriginal,
        fechaCierre,
        fechaVencimiento,
        descripcion: 'Su pago en pesos',
        monto,
        tipo: 'egreso',
        medioPago: 'Crédito',
        tarjeta: cordobesaTarjetaId,
        responsable,
        estado: 'pagado',
        contabiliza: false,
        etiquetaEspecial: 'Pago de Resumen',
        origen: 'Tarjeta Cordobesa (3435)'
      });
      continue;
    }

    // Detectar Impuesto de Sellos
    if (resto.includes('IMPUESTO DE SELLOS')) {
      const tokens = resto.split(/\s+/);
      const montoToken = tokens[tokens.length - 2] || tokens[tokens.length - 1];
      const monto = Math.abs(limpiarMonto(montoToken));
      items.push({
        idTemp: `cordobesa_sellos_${fechaCierre}`,
        fecha: fechaCierre,
        fechaCompraOriginal,
        fechaCierre,
        fechaVencimiento,
        descripcion: 'Impuesto de Sellos Tarjeta Cordobesa',
        monto,
        tipo: 'egreso',
        medioPago: 'Crédito',
        tarjeta: cordobesaTarjetaId,
        responsable,
        estado: 'pagado',
        contabiliza: true,
        etiquetaEspecial: 'Impuesto Tarjeta',
        origen: 'Tarjeta Cordobesa (3435)'
      });
      continue;
    }

    // Detectar DB IVA
    if (resto.includes('DB IVA')) {
      const tokens = resto.split(/\s+/);
      const montoToken = tokens[tokens.length - 2];
      const monto = Math.abs(limpiarMonto(montoToken));
      items.push({
        idTemp: `cordobesa_iva_${fechaCierre}`,
        fecha: fechaCierre,
        fechaCompraOriginal,
        fechaCierre,
        fechaVencimiento,
        descripcion: 'IVA 21% Tarjeta Cordobesa',
        monto,
        tipo: 'egreso',
        medioPago: 'Crédito',
        tarjeta: cordobesaTarjetaId,
        responsable,
        estado: 'pagado',
        contabiliza: true,
        etiquetaEspecial: 'Impuesto Tarjeta',
        origen: 'Tarjeta Cordobesa (3435)'
      });
      continue;
    }

    // Detectar Comisión Mantenimiento
    if (resto.includes('COMISIÓN POR MANTENIMIENTO') || resto.includes('COMISION POR MANTENIMIENTO')) {
      const tokens = resto.split(/\s+/);
      const montoToken = tokens[tokens.length - 2] || tokens[tokens.length - 1];
      const monto = Math.abs(limpiarMonto(montoToken));
      items.push({
        idTemp: `cordobesa_mant_${fechaCierre}`,
        fecha: fechaCierre,
        fechaCompraOriginal,
        fechaCierre,
        fechaVencimiento,
        descripcion: 'Comisión por Mantenimiento de Cuenta Tarjeta Cordobesa',
        monto,
        tipo: 'egreso',
        medioPago: 'Crédito',
        tarjeta: cordobesaTarjetaId,
        responsable,
        estado: 'pagado',
        contabiliza: true,
        etiquetaEspecial: 'Cargo Tarjeta',
        origen: 'Tarjeta Cordobesa (3435)'
      });
      continue;
    }

    // Compras regulares
    const tokens = resto.split(/\s+/);
    if (tokens.length < 2) continue;

    // Los dos últimos tokens son PESOS y DOLARES
    const montoPesosStr = tokens[tokens.length - 2];
    const monto = Math.abs(limpiarMonto(montoPesosStr));
    if (monto === 0) continue;

    let comp = '';
    let startTokenIdx = 0;
    if (/^\d{6}$/.test(tokens[0])) {
      comp = tokens[0];
      startTokenIdx = 1;
    }

    const descTokens = tokens.slice(startTokenIdx, tokens.length - 2);
    let descRaw = descTokens.join(' ');

    // Detectar cuota C.XX/YY
    let cuotas = null;
    const matchCuota = descRaw.match(/C\.(\d{2})\/(\d{2})/i);
    if (matchCuota) {
      cuotas = `${parseInt(matchCuota[1], 10)}/${parseInt(matchCuota[2], 10)}`;
      descRaw = descRaw.replace(matchCuota[0], '').trim();
    }

    // Política de Fechas:
    // - Si la compra ocurrió en septiembre: mantiene su fecha real de compra.
    // - Si es una cuota o compra de meses anteriores: se imputa a la fecha de cierre del resumen (2026-09-24).
    const esMesLiquidado = fechaCompraOriginal.startsWith(mesLiquidado);
    const fechaImputacion = esMesLiquidado ? fechaCompraOriginal : fechaCierre;
    let descripcionFinal = descRaw;

    if (cuotas) {
      if (!esMesLiquidado) {
        const [fy, fm, fd] = fechaCompraOriginal.split('-');
        descripcionFinal = `${descRaw} (${cuotas} - compra ${fd}/${fm}/${fy})`;
      } else {
        descripcionFinal = `${descRaw} (${cuotas})`;
      }
    } else if (!esMesLiquidado) {
      const [fy, fm, fd] = fechaCompraOriginal.split('-');
      descripcionFinal = `${descRaw} (compra ${fd}/${fm}/${fy})`;
    }

    const refId = comp || `${items.length}`;

    items.push({
      idTemp: `cordobesa_${refId}_${fechaImputacion}`,
      fecha: fechaImputacion,
      fechaCompraOriginal,
      fechaCierre,
      fechaVencimiento,
      descripcion: descripcionFinal,
      monto,
      tipo: 'egreso',
      medioPago: 'Crédito',
      tarjeta: cordobesaTarjetaId,
      responsable,
      estado: 'pagado',
      refId,
      cuotas,
      contabiliza: true,
      etiquetaEspecial: cuotas ? `Cuota ${cuotas}` : '',
      origen: 'Tarjeta Cordobesa (3435)'
    });
  }

  return items;
}
