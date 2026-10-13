/**
 * mercadoPagoParser.js
 * Parser para extractos y reportes exportados desde Mercado Pago (.csv y .pdf)
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parsearMontoMoneda } from './utils.js';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export function parsearMercadoPagoCsv(contenidoTexto, config = {}) {
  const lineas = contenidoTexto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items = [];

  let headerIndex = -1;
  for (let i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().includes('RELEASE_DATE') && lineas[i].toUpperCase().includes('TRANSACTION_NET_AMOUNT')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('El archivo no contiene el formato estándar de extracto de Mercado Pago (falta columna RELEASE_DATE).');
  }

  for (let i = headerIndex + 1; i < lineas.length; i++) {
    const linea = lineas[i];
    const partes = linea.split(';');
    if (partes.length < 4) continue;

    const fechaRaw = partes[0].trim(); // DD-MM-YYYY
    const descripcionRaw = partes[1].trim();
    const refId = partes[2].trim();
    const montoRaw = partes[3].trim(); // Formato: -31.800,00 o 5,18

    // Parsear fecha DD-MM-YYYY a YYYY-MM-DD
    const matchFecha = fechaRaw.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (!matchFecha) continue;
    const fecha = `${matchFecha[3]}-${matchFecha[2]}-${matchFecha[1]}`;

    // Parsear monto numérico
    const valorNumerico = parsearMontoMoneda(montoRaw);
    if (!valorNumerico || isNaN(valorNumerico) || valorNumerico === 0) continue;

    const esEgreso = valorNumerico < 0;
    const montoAbs = Math.abs(valorNumerico);
    const descLower = descripcionRaw.toLowerCase();

    // 1. Rendimientos
    const esRendimiento = descLower.includes('rendimiento');

    // 2. Transferencias de/hacia cuentas propias (mismo titular / hogar)
    const esCuentaPropia = 
      descLower.includes('cejas justo jose andres') ||
      descLower.includes('justo jose andres cejas') ||
      descLower.includes('justo jose andres ceja') ||
      descLower.includes('maurizi cecilia soledad') ||
      descLower.includes('maurizi cecilia soleda');

    const esFondeo = descLower.includes('ingreso de dinero');

    let contabiliza = true;
    let etiquetaEspecial = '';
    let alertaImportacion = '';

    if (esCuentaPropia) {
      contabiliza = false;
      etiquetaEspecial = 'Movimiento Interno';
    } else if (esRendimiento) {
      etiquetaEspecial = 'Rendimiento Billetera';
    } else if (esFondeo) {
      alertaImportacion = 'Posible recarga / fondeo (verificar si salió de otra cuenta)';
    }

    const esCeci = (config.responsableDefault || '').toLowerCase().includes('cecilia');
    const tMp = config.tarjetas?.find(t => 
      (t.nombre?.toLowerCase().includes('mercado') || t.nombre?.toLowerCase().includes('meli')) && 
      (esCeci ? t.nombre?.toLowerCase().includes('cecilia') : t.nombre?.toLowerCase().includes('andres'))
    ) || config.tarjetas?.find(t => t.nombre?.toLowerCase().includes('mercado') || t.nombre?.toLowerCase().includes('meli'));

    items.push({
      idTemp: `mp_${refId || i}_${fecha}`,
      fecha,
      descripcion: descripcionRaw,
      monto: montoAbs,
      tipo: esRendimiento ? 'ingreso' : (esEgreso ? 'egreso' : 'ingreso'),
      medioPago: 'Mercado Pago',
      tarjeta: tMp?.id || (esCeci ? 'mercadopago_cecilia' : 'mercadopago_andres'),
      responsable: config.responsableDefault || 'Andres',
      estado: 'pagado',
      refId,
      contabiliza,
      etiquetaEspecial,
      alertaImportacion,
      origen: 'Mercado Pago'
    });
  }

  return items;
}

/**
 * Parsea un ArrayBuffer de un extracto mensual oficial en PDF de Mercado Pago ("RESUMEN DE CUENTA EN PESOS")
 */
export async function parsearMercadoPagoPdf(arrayBuffer, config = {}) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let titularDetectado = config.responsableDefault || 'Andres';
  const items = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const textItems = content.items
      .map(it => ({
        str: it.str.trim(),
        x: Math.round(it.transform[4]),
        y: Math.round(it.transform[5])
      }))
      .filter(it => it.str.length > 0);

    // 1. Detectar titular en la primera página
    if (p === 1) {
      const fullText = textItems.map(it => it.str).join(' ').toLowerCase();
      if (fullText.includes('cecilia') || fullText.includes('maurizi')) {
        titularDetectado = 'Cecilia';
      } else if (fullText.includes('andres') || fullText.includes('cejas')) {
        titularDetectado = 'Andres';
      }
    }

    // 2. Localizar filas por fecha (columna Fecha en x ~ 41, formato DD-MM-YYYY)
    const fechas = textItems.filter(it => Math.abs(it.x - 41) <= 10 && /^\d{2}-\d{2}-\d{4}$/.test(it.str));
    fechas.sort((a, b) => b.y - a.y);

    for (let i = 0; i < fechas.length; i++) {
      const f = fechas[i];
      const yPrev = i > 0 ? fechas[i - 1].y : f.y + 20;
      const yNext = i + 1 < fechas.length ? fechas[i + 1].y : f.y - 20;

      const yTop = (f.y + yPrev) / 2;
      const yBottom = (f.y + yNext) / 2;

      const rowItems = textItems.filter(it => it.y <= yTop && it.y > yBottom);

      // Descripción: tokens en x entre 75 y 193 (ordenados por Y decreciente, luego X)
      const descItems = rowItems.filter(it => it.x >= 75 && it.x < 193);
      descItems.sort((a, b) => b.y - a.y || a.x - b.x);
      const descripcionRaw = descItems.map(it => it.str).join(' ').trim();

      // ID de la operación: x ~ 197
      const opItem = rowItems.find(it => Math.abs(it.x - 197) <= 18 && /^\d+$/.test(it.str));
      const refId = opItem ? opItem.str : '';

      // Valor: x entre 270 y 350, con signo $
      const valorItem = rowItems.find(it => it.x >= 270 && it.x < 350 && it.str.includes('$'));
      const valorStr = valorItem ? valorItem.str : '';
      const esNegativo = valorStr.includes('-');
      const limpio = valorStr.replace(/[^\d,]/g, '').replace(',', '.');
      const montoAbs = Math.abs(parseFloat(limpio)) || 0;
      if (montoAbs === 0) continue;

      const [d, m, y] = f.str.split('-');
      const fecha = `${y}-${m}-${d}`;

      const descLower = descripcionRaw.toLowerCase();
      const esRendimiento = descLower.includes('rendimiento');
      const esCuentaPropia =
        descLower.includes('cejas justo jose andres') ||
        descLower.includes('justo jose andres cejas') ||
        descLower.includes('justo jose andres ceja') ||
        descLower.includes('maurizi cecilia soledad') ||
        descLower.includes('maurizi cecilia soleda') ||
        descLower.includes('cecilia soledad maurizi');

      const esFondeo = descLower.includes('ingreso de dinero');

      let contabiliza = true;
      let etiquetaEspecial = '';
      let alertaImportacion = '';
      if (esCuentaPropia) {
        contabiliza = false;
        etiquetaEspecial = 'Movimiento Interno';
      } else if (esRendimiento) {
        etiquetaEspecial = 'Rendimiento Billetera';
      } else if (esFondeo) {
        alertaImportacion = 'Posible recarga / fondeo (verificar si salió de otra cuenta)';
      }

      const esCeci = (titularDetectado || '').toLowerCase().includes('cecilia');
      const tMp = config.tarjetas?.find(t => 
        (t.nombre?.toLowerCase().includes('mercado') || t.nombre?.toLowerCase().includes('meli')) && 
        (esCeci ? t.nombre?.toLowerCase().includes('cecilia') : t.nombre?.toLowerCase().includes('andres'))
      ) || config.tarjetas?.find(t => t.nombre?.toLowerCase().includes('mercado') || t.nombre?.toLowerCase().includes('meli'));

      items.push({
        idTemp: `mp_${refId || i}_${fecha}`,
        fecha,
        descripcion: descripcionRaw,
        monto: montoAbs,
        tipo: esRendimiento ? 'ingreso' : (esNegativo ? 'egreso' : 'ingreso'),
        medioPago: 'Mercado Pago',
        tarjeta: tMp?.id || (esCeci ? 'mercadopago_cecilia' : 'mercadopago_andres'),
        responsable: titularDetectado,
        estado: 'pagado',
        refId,
        contabiliza,
        etiquetaEspecial,
        alertaImportacion,
        origen: `Mercado Pago (${titularDetectado})`
      });
    }
  }

  items.responsableDetectado = titularDetectado;
  return items;
}
