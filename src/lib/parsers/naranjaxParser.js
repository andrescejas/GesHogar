/**
 * naranjaxParser.js
 * Parser para extractos mensuales en formato PDF de Cuenta / Billetera Virtual Naranja X.
 */
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

const MESES = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', sept: '09', oct: '10', nov: '11', dic: '12'
};

function limpiarMonto(str) {
  if (!str) return 0;
  const limpio = str.replace(/[^\d,-]/g, '').replace(',', '.');
  return Math.abs(parseFloat(limpio)) || 0;
}

/**
 * Parsea un ArrayBuffer de un PDF de Naranja X y retorna los movimientos normalizados
 */
export async function parsearNaranjaXFile(arrayBuffer, config = {}) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let mesDetectado = '09';
  const anioActual = new Date().getFullYear();
  let anioDetectado = config.anio || anioActual;
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

    // 1. Detectar titular en encabezado de página 1
    if (p === 1) {
      const fullText = textItems.map(it => it.str).join(' ').toLowerCase();
      if (fullText.includes('cecilia') || fullText.includes('maurizi')) {
        titularDetectado = 'Cecilia';
      } else if (fullText.includes('andres') || fullText.includes('cejas')) {
        titularDetectado = 'Andres';
      }
    }

    // 2. Detectar mes del resumen en encabezado
    for (const it of textItems) {
      const matchMes = it.str.match(/Resumen del mes de\s+([a-zA-Z]+)/i);
      if (matchMes) {
        const nombreMes = matchMes[1].toLowerCase();
        if (MESES[nombreMes]) {
          mesDetectado = MESES[nombreMes];
        }
      }
    }

    // 3. Ignorar páginas de cuenta en dólares
    const esDolares = textItems.some(it => it.str.includes('Datos cuenta en dólares'));
    if (esDolares) continue;

    // 4. Detectar filas de transacciones por fecha (columna Fecha en x ~ 73: ej. "01/SEPT" o "01/SEPT 14294144869")
    const filasTransacciones = [];
    textItems.forEach(it => {
      const dateMatch = it.str.match(/^(\d{2})\/([A-Z]+)(?:\s+(\d+))?/);
      if (dateMatch && Math.abs(it.x - 73) <= 15) {
        filasTransacciones.push({
          y: it.y,
          dia: dateMatch[1],
          mesStr: dateMatch[2].toLowerCase(),
          nroOpToken: dateMatch[3] || '',
          dateToken: it.str
        });
      }
    });

    // Ordenar filas de arriba hacia abajo (y decreciente)
    filasTransacciones.sort((a, b) => b.y - a.y);

    for (let i = 0; i < filasTransacciones.length; i++) {
      const fila = filasTransacciones[i];
      const yMin = (i + 1 < filasTransacciones.length) ? (fila.y + filasTransacciones[i + 1].y) / 2 : fila.y - 30;
      const yMax = (i > 0) ? (fila.y + filasTransacciones[i - 1].y) / 2 : fila.y + 15;

      const itemsDeFila = textItems.filter(it => it.y >= yMin && it.y < yMax);

      let nroOp = fila.nroOpToken;
      let descPartes = [];
      let ingresoMonto = null;
      let egresoMonto = null;

      // Ordenar por Y descendente, luego X ascendente para armar la descripción multilínea
      itemsDeFila.sort((a, b) => b.y - a.y || a.x - b.x);

      itemsDeFila.forEach(it => {
        // Ignorar el token de fecha
        if (it.str === fila.dateToken && Math.abs(it.x - 73) <= 15) return;

        // Nº de operación (si viene en columna separada)
        if (!nroOp && Math.abs(it.x - 115) <= 18 && /^\d+$/.test(it.str)) {
          nroOp = it.str;
        }
        // Descripción: x ~ 160 a 300
        else if (it.x >= 160 && it.x < 300 && !it.str.startsWith('$')) {
          descPartes.push(it.str);
        }
        // Ingreso: x ~ 300 a 375
        else if (it.x >= 300 && it.x < 375 && it.str.includes('$')) {
          ingresoMonto = limpiarMonto(it.str);
        }
        // Egreso: x ~ 380 a 445
        else if (it.x >= 380 && it.x < 445 && it.str.includes('$')) {
          egresoMonto = limpiarMonto(it.str);
        }
      });

      const mes = MESES[fila.mesStr] || mesDetectado;
      const fecha = `${anioDetectado}-${mes}-${fila.dia}`;
      const descripcion = descPartes.join(' ').trim();
      const tipo = ingresoMonto !== null ? 'ingreso' : 'egreso';
      const monto = ingresoMonto !== null ? ingresoMonto : (egresoMonto || 0);

      // Criterios de clasificación y no-cómputo
      const descUpper = descripcion.toUpperCase();
      const esTransferenciaPropia = 
        descUpper.includes('JUSTO JOSE ANDRES CEJAS') || 
        descUpper.includes('JUSTO JOSÉ ANDRÉS CEJAS') ||
        descUpper.includes('CEJAS JUSTO JOSE ANDRES') ||
        descUpper.includes('ANDRES CEJAS') ||
        descUpper.includes('ANDRÉS CEJAS') ||
        descUpper.includes('MAURIZI CECILIA SOLEDAD') ||
        descUpper.includes('CECILIA SOLEDAD MAURIZI') ||
        descUpper.includes('CECILIA MAURIZI');
      const esFondoSilvana = 
        descUpper.includes('COCOS CAPITAL') || 
        descUpper.includes('MAURIZI SILVANA') ||
        descUpper.includes('SILVANA ELENA MAURIZI') ||
        descUpper.includes('SILVANA MAURIZI');
      const esRendimiento = descUpper.includes('RENDIMIENTO DIARIO') || descUpper.includes('RENDIMIENTO');
      const esFondeo = descUpper.includes('INGRESO DE DINERO');

      let contabiliza = true;
      let etiquetaEspecial = '';
      let alertaImportacion = '';

      if (esTransferenciaPropia) {
        contabiliza = false;
        etiquetaEspecial = 'Movimiento Interno';
      } else if (esFondoSilvana) {
        contabiliza = false;
        etiquetaEspecial = 'Fondos Terceros (Silvana)';
      } else if (esRendimiento) {
        etiquetaEspecial = 'Rendimiento Billetera';
      } else if (esFondeo) {
        alertaImportacion = 'Posible recarga / fondeo (verificar si salió de otra cuenta)';
      }

      const esCeci = (titularDetectado || '').toLowerCase().includes('cecilia');
      const tNx = config.tarjetas?.find(t => 
        t.nombre?.toLowerCase().includes('naranja') && 
        (esCeci ? t.nombre?.toLowerCase().includes('cecilia') : t.nombre?.toLowerCase().includes('andres'))
      ) || config.tarjetas?.find(t => t.nombre?.toLowerCase().includes('naranja'));

      items.push({
        idTemp: `nx_${nroOp || i}_${fecha}`,
        fecha,
        descripcion,
        tipo,
        monto,
        medioPago: 'Naranja X',
        tarjeta: tNx?.id || (esCeci ? 'naranjax_cecilia' : 'naranjax_andres'),
        moneda: 'ARS',
        contabiliza,
        etiquetaEspecial,
        alertaImportacion,
        refId: nroOp || undefined,
        responsable: titularDetectado,
        estado: 'pagado',
        origen: `Billetera Naranja X (${titularDetectado})`
      });
    }
  }

  items.responsableDetectado = titularDetectado;
  return items;
}
