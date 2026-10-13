/**
 * index.js (Parsers Hub)
 * Coordina los parsers de Mercado Pago, Santander y detecta automáticamente el origen.
 */
import { parsearMercadoPagoCsv, parsearMercadoPagoPdf } from './mercadoPagoParser.js';
import { parsearSantanderFile } from './santanderParser.js';
import { parsearVisaFile } from './visaParser.js';
import { parsearAmexFile } from './amexParser.js';
import { parsearNaranjaXFile } from './naranjaxParser.js';
import { parsearBancorFile } from './bancorParser.js';
import { parsearCordobesaFile } from './cordobesaParser.js';
import { clasificarMovimiento } from './clasificadorReglas.js';
import { esMovimientoDuplicado, generarHashTransaccion } from './deduplicador.js';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export async function parsearArchivoResumen(file, config = {}) {
  const nombreArchivo = (file.name || '').toLowerCase();
  let transaccionesCrudas = [];
  let origenDetectado = 'Desconocido';
  let responsableDetectado = '';

  // 1. Detección por extensión y contenido
  if (nombreArchivo.endsWith('.csv') || nombreArchivo.endsWith('.txt')) {
    const texto = await file.text();
    if (texto.includes('RELEASE_DATE') || texto.includes('TRANSACTION_NET_AMOUNT')) {
      origenDetectado = 'Mercado Pago';
      transaccionesCrudas = parsearMercadoPagoCsv(texto, config);
    } else if (texto.includes('Santander') || texto.includes('Caja de Ahorro')) {
      origenDetectado = 'Banco Santander';
      transaccionesCrudas = parsearSantanderFile(texto, config);
    } else {
      // Intentar Mercado Pago por defecto para CSV
      origenDetectado = 'Mercado Pago';
      transaccionesCrudas = parsearMercadoPagoCsv(texto, config);
    }
  } else if (nombreArchivo.endsWith('.xlsx') || nombreArchivo.endsWith('.xls')) {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const firstRowsText = (() => {
      try {
        if (!firstSheet) return '';
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        return JSON.stringify(rows.slice(0, 15)).toLowerCase();
      } catch {
        return '';
      }
    })();

    const isAmex = nombreArchivo.includes('american express') || 
      nombreArchivo.includes('amex') || 
      wb.SheetNames.some(s => s.toLowerCase().includes('american express') || s.toLowerCase().includes('amex')) ||
      firstRowsText.includes('american express') ||
      firstRowsText.includes('amex');

    const isVisa = !isAmex && (
      nombreArchivo.includes('visa') || 
      wb.SheetNames.some(s => s.toLowerCase().includes('visa')) ||
      firstRowsText.includes('visa') ||
      firstRowsText.includes('fecha de cierre')
    );

    const isBancor = nombreArchivo.includes('bancor') || 
      nombreArchivo.startsWith('ca $') || 
      nombreArchivo.includes('cordobesa') || 
      wb.SheetNames.some(s => s.toLowerCase().includes('table 1') || s.toLowerCase().includes('bancor')) ||
      firstRowsText.includes('listado de movimientos') ||
      firstRowsText.includes('ca $');

    if (isAmex) {
      origenDetectado = 'Tarjeta American Express Santander';
      transaccionesCrudas = parsearAmexFile(arrayBuffer, config);
    } else if (isVisa) {
      origenDetectado = 'Tarjeta Visa Santander';
      transaccionesCrudas = parsearVisaFile(arrayBuffer, config);
    } else if (isBancor) {
      origenDetectado = 'Banco de Córdoba (Bancor)';
      const respBancor = (config.responsableDefault && config.responsableDefault !== 'Andres')
        ? config.responsableDefault
        : 'Cecilia';
      transaccionesCrudas = parsearBancorFile(arrayBuffer, { ...config, responsableDefault: respBancor });
    } else {
      origenDetectado = 'Banco Santander';
      transaccionesCrudas = parsearSantanderFile(arrayBuffer, config);
    }
  } else if (nombreArchivo.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();

    // Detección automática por nombre de archivo o inspección de primera página
    let isCordobesa = nombreArchivo.includes('cordobesa') || nombreArchivo.includes('bancor');
    let isNaranja = nombreArchivo.includes('naranja');
    let isMercadoPago = nombreArchivo.includes('mercadopago') || nombreArchivo.includes('mercado pago') || nombreArchivo.includes('mp');

    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const pdf = await loadingTask.promise;
      const page1 = await pdf.getPage(1);
      const textContent = await page1.getTextContent();
      const textoUnido = textContent.items.map(it => it.str).join(' ').toLowerCase();

      if (
        textoUnido.includes('mercadopago') || 
        textoUnido.includes('mercado libre') || 
        textoUnido.includes('resumen de cuenta en pesos')
      ) {
        isMercadoPago = true;
        isCordobesa = false;
        isNaranja = false;
      } else if (
        textoUnido.includes('cordobesa') || 
        textoUnido.includes('banco de cordoba') || 
        textoUnido.includes('banco de córdoba') || 
        textoUnido.includes('cierre actual')
      ) {
        isCordobesa = true;
        isMercadoPago = false;
        isNaranja = false;
      } else if (textoUnido.includes('naranja')) {
        isNaranja = true;
        isMercadoPago = false;
        isCordobesa = false;
      }
    } catch (err) {
      console.warn('Error auto-detectando tipo de PDF:', err);
    }

    if (isMercadoPago) {
      transaccionesCrudas = await parsearMercadoPagoPdf(arrayBuffer, config);
      responsableDetectado = transaccionesCrudas.responsableDetectado || transaccionesCrudas[0]?.responsable || 'Andres';
      origenDetectado = `Mercado Pago (${responsableDetectado})`;
    } else if (isCordobesa) {
      origenDetectado = 'Tarjeta Cordobesa Mastercard';
      const respCordobesa = (config.responsableDefault && config.responsableDefault !== 'Andres')
        ? config.responsableDefault
        : 'Cecilia';
      responsableDetectado = respCordobesa;
      transaccionesCrudas = await parsearCordobesaFile(arrayBuffer, {
        ...config,
        responsableDefault: respCordobesa
      });
    } else {
      transaccionesCrudas = await parsearNaranjaXFile(arrayBuffer, config);
      responsableDetectado = transaccionesCrudas.responsableDetectado || transaccionesCrudas[0]?.responsable || config.responsableDefault || 'Andres';
      origenDetectado = `Billetera / Tarjeta Naranja X (${responsableDetectado})`;
    }
  } else {
    throw new Error('Formato de archivo no soportado. Por favor sube un archivo .csv, .xlsx o .pdf');
  }

  // 2. Procesar clasificación y duplicados
  const { reglasFirestore = [], categorias = [], subcategorias = [], movimientosExistentes = [] } = config;

  const resultado = transaccionesCrudas.map(item => {
    // Clasificar si es un gasto o ingreso computable
    const clasificacion = clasificarMovimiento(
      item.descripcion,
      reglasFirestore,
      categorias,
      subcategorias
    );

    // Calcular hash de deduplicación
    const transaccionHash = generarHashTransaccion(item);
    const esDuplicado = esMovimientoDuplicado(
      { ...item, transaccionHash },
      movimientosExistentes
    );

    return {
      ...item,
      categoriaId: clasificacion.categoriaId || '',
      subcategoriaId: clasificacion.subcategoriaId || '',
      categoriaNombre: clasificacion.categoriaNombre || '',
      subcategoriaNombre: clasificacion.subcategoriaNombre || '',
      origenRegla: clasificacion.origenRegla,
      transaccionHash,
      esDuplicado,
      seleccionado: !esDuplicado && (item.etiquetaEspecial === 'Fondos Terceros (Silvana)' || (item.contabiliza !== false && !item.esRendimiento && !item.alertaImportacion)), // seleccionados por defecto computables y fondos de terceros no duplicados
      guardarRegla: false // si el usuario desea recordar esta clasificación
    };
  });

  return {
    origenDetectado,
    responsableDetectado: responsableDetectado || config.responsableDefault || 'Andres',
    nombreArchivo: file.name,
    totalLeidos: resultado.length,
    items: resultado
  };
}
