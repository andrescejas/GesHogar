/**
 * cuentaHelper.js
 * Lógica unificada para resolver la cuenta / tarjeta / medio de pago
 * asociada a un movimiento en GesHogar.
 */

export function getOrigenCuenta(m, tarjetas = []) {
  if (!m) return { id: 'manual', label: 'Manual / Otros', icono: '📝' };

  if (m.tarjeta) {
    const t = tarjetas.find(tar => 
      tar.id === m.tarjeta || 
      tar.nombre?.toLowerCase().trim() === m.tarjeta.toLowerCase().trim()
    );
    if (t) {
      let icono = '💳';
      const nom = (t.nombre || '').toLowerCase();
      if (nom.includes('mercado') || nom.includes('meli')) icono = '🔷';
      else if (nom.includes('bancor') || nom.includes('córdoba') || nom.includes('cordoba')) icono = '🏛️';
      else if (nom.includes('santander')) icono = '🔴';
      else if (nom.includes('naranja')) icono = '🟠';
      return { id: t.id, label: t.nombre, icono };
    }
  }

  const orig = (m.origen || '').toLowerCase();
  const medio = (m.medioPago || '').toLowerCase();
  const tarj = (m.tarjeta || '').toLowerCase();

  // 0. Efectivo
  if (medio.includes('efectivo') || tarj.includes('efectivo') || orig.includes('efectivo')) {
    return { id: 'medio_efectivo', label: 'Efectivo', icono: '💵' };
  }

  // 1. Bancor
  if (orig.includes('bancor') || orig.includes('córdoba') || orig.includes('cordoba') || tarj.includes('bancor')) {
    const t = tarjetas.find(tar => tar.nombre?.toLowerCase().includes('bancor'));
    return { id: t?.id || 'bancor', label: t?.nombre || 'Bancor - Cecilia', icono: '🏛️' };
  }

  // 2. Cordobesa (tarjeta de crédito de Bancor)
  if (orig.includes('cordobesa') || medio.includes('cordobesa') || tarj.includes('cordobesa')) {
    const t = tarjetas.find(tar => tar.nombre?.toLowerCase().includes('cordobesa'));
    return { id: t?.id || 'cordobesa', label: t?.nombre || 'Cordobesa - Cecilia', icono: '💳' };
  }

  // 3. Mercado Pago (diferenciado por titular)
  if (orig.includes('mercado pago') || medio.includes('mercado pago') || orig.includes('mercadopago') || orig.includes('meli') || medio.includes('meli') || tarj.includes('mercado') || tarj.includes('meli')) {
    const esCeci = orig.includes('cecilia') || tarj.includes('cecilia') || (!orig.includes('andres') && m.responsable === 'Cecilia');
    const t = tarjetas.find(tar => 
      (tar.nombre?.toLowerCase().includes('mercado') || tar.nombre?.toLowerCase().includes('meli')) && 
      (esCeci ? tar.nombre?.toLowerCase().includes('cecilia') : tar.nombre?.toLowerCase().includes('andres'))
    ) || tarjetas.find(tar => tar.nombre?.toLowerCase().includes('mercado') || tar.nombre?.toLowerCase().includes('meli'));
    return { 
      id: t?.id || (esCeci ? 'mercadopago_cecilia' : 'mercadopago_andres'), 
      label: t?.nombre || (esCeci ? 'Mercado Pago - Cecilia' : 'Mercado Pago - Andres'), 
      icono: '🔷' 
    };
  }

  // 4. Naranja X (diferenciado por titular)
  if (orig.includes('naranja') || medio.includes('naranja') || tarj.includes('naranja')) {
    const esCeci = orig.includes('cecilia') || tarj.includes('cecilia') || (!orig.includes('andres') && m.responsable === 'Cecilia');
    const t = tarjetas.find(tar => 
      tar.nombre?.toLowerCase().includes('naranja') && 
      (esCeci ? tar.nombre?.toLowerCase().includes('cecilia') : tar.nombre?.toLowerCase().includes('andres'))
    ) || tarjetas.find(tar => tar.nombre?.toLowerCase().includes('naranja'));
    return { 
      id: t?.id || (esCeci ? 'naranjax_cecilia' : 'naranjax_andres'), 
      label: t?.nombre || (esCeci ? 'Naranja X - Cecilia' : 'Naranja X - Andres'), 
      icono: '🟠' 
    };
  }

  // 5. Banco Santander (Cuenta)
  if ((orig.includes('santander') || tarj.includes('santander')) && !orig.includes('visa') && !orig.includes('amex') && !orig.includes('american') && !orig.includes('master') && !tarj.includes('visa') && !tarj.includes('amex')) {
    const t = tarjetas.find(tar => 
      tar.nombre?.toLowerCase().includes('santander') && 
      !tar.nombre?.toLowerCase().includes('visa') && 
      !tar.nombre?.toLowerCase().includes('amex') && 
      !tar.nombre?.toLowerCase().includes('american') && 
      !tar.nombre?.toLowerCase().includes('master')
    );
    return { 
      id: t?.id || 'santander_cuenta', 
      label: t?.nombre || 'Cuenta Santander - Andres', 
      icono: '🔴' 
    };
  }

  // 6. Visa Crédito
  if (orig.includes('visa') || tarj.includes('visa')) {
    const t = tarjetas.find(tar => tar.nombre?.toLowerCase().includes('visa') && tar.nombre?.toLowerCase().includes('crédito'));
    return { id: t?.id || 'visa', label: t?.nombre || 'Visa Crédito - Andres', icono: '💳' };
  }

  // 7. American Express
  if (orig.includes('amex') || orig.includes('american express') || tarj.includes('amex') || tarj.includes('american')) {
    const t = tarjetas.find(tar => tar.nombre?.toLowerCase().includes('amex') || tar.nombre?.toLowerCase().includes('american'));
    return { id: t?.id || 'amex', label: t?.nombre || 'American Express - Andres', icono: '💳' };
  }

  if (m.tarjeta) {
    return { id: `tarjeta_${m.tarjeta}`, label: m.tarjeta, icono: '💳' };
  }

  if (m.medioPago && m.medioPago !== 'Tarjeta') {
    return { id: `medio_${medio.replace(/\s+/g, '_')}`, label: m.medioPago, icono: '💵' };
  }

  return { id: 'manual', label: 'Manual / Otros', icono: '📝' };
}
