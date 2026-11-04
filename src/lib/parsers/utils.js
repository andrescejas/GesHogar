/**
 * utils.js
 * Utilidades compartidas para parsers bancarios y de billeteras virtuales.
 */

export function parsearMontoMoneda(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).trim().replace(/[$]|u\$s|usd/gi, '').trim();
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  return parseFloat(str) || 0;
}

const MESES_MAP = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

/**
 * Agrupa y consolida múltiples micro-rendimientos diarios en un único registro mensual contable.
 */
export function consolidarRendimientos(items, titular = 'Andres', entidad = 'Mercado Pago') {
  const rends = items.filter(it => it.esRendimiento);
  if (rends.length === 0) return items;

  const noRends = items.filter(it => !it.esRendimiento);
  const totalMonto = rends.reduce((acc, it) => acc + (it.monto || 0), 0);
  if (totalMonto <= 0) return items;

  // Fecha de corte: la fecha más reciente de los rendimientos
  const fechas = rends.map(it => it.fecha).filter(Boolean).sort();
  const fechaMax = fechas[fechas.length - 1] || new Date().toISOString().split('T')[0];
  const [y, m] = fechaMax.split('-');
  const nombreMes = MESES_MAP[m] || m;

  const esCeci = (titular || '').toLowerCase().includes('cecilia');
  const tarjetaDefault = entidad.toLowerCase().includes('naranja')
    ? (esCeci ? 'naranjax_cecilia' : 'naranjax_andres')
    : (esCeci ? 'mercadopago_cecilia' : 'mercadopago_andres');

  const tarjetaId = rends[0]?.tarjeta || tarjetaDefault;

  const consolidado = {
    idTemp: `${entidad.toLowerCase().replace(/[^a-z0-9]/g, '_')}_rendimientos_${titular.toLowerCase()}_${y}_${m}`,
    fecha: fechaMax,
    descripcion: `Rendimientos ${entidad} - ${nombreMes} ${y} (Consolidado)`,
    monto: Math.round(totalMonto * 100) / 100,
    tipo: 'ingreso',
    medioPago: entidad,
    tarjeta: tarjetaId,
    responsable: titular,
    estado: 'pagado',
    contabiliza: true,
    etiquetaEspecial: 'Rendimiento Billetera (Consolidado)',
    alertaImportacion: `Consolida ${rends.length} rendimientos diarios del extracto.`,
    esRendimiento: true,
    esConsolidado: true,
    origen: `${entidad} (${titular})`
  };

  const resultado = [...noRends, consolidado];
  if (items.responsableDetectado) {
    resultado.responsableDetectado = items.responsableDetectado;
  }
  return resultado;
}
