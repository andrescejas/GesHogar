/**
 * clasificadorReglas.js
 * Motor de auto-clasificación para mapear conceptos de extractos bancarios y billeteras
 * a las Categorías y Subcategorías existentes en GesHogar.
 */

// Diccionario base de patrones conocidos y frecuentes
export const REGLAS_PREDETERMINADAS = [
  // Alimentación
  { pattern: /dinosaurio|mingjie zhuang|supermercado|lafore|coto|carrefour|dia %|disco|vea|jumbo|hiper/i, catNombre: 'Alimentacion', subNombre: 'Supermercado' },
  { pattern: /carniceria|frigorifico|pollo|granja/i, catNombre: 'Alimentacion', subNombre: 'Carniceria' },
  { pattern: /feria|walterferia|verduleria|frutas|verduras/i, catNombre: 'Alimentacion', subNombre: 'Verduleria' },
  { pattern: /dietetica|nutricion/i, catNombre: 'Alimentacion', subNombre: 'Dietetica' },
  { pattern: /pedidosya|strega|rappi|mcdonald|burger|heladeria|grido/i, catNombre: 'Alimentacion', subNombre: 'Gustos / Snacks' },

  // Indumentaria
  { pattern: /port said|ver shopping|indumentaria|ropa|zara/i, catNombre: 'Indumentaria', subNombre: 'Ropa' },

  // Servicios
  { pattern: /distribuidora de gas del centro|ecogas/i, catNombre: 'Servicios', subNombre: 'Gas' },
  { pattern: /aguascordobesas|aguas cordobesas/i, catNombre: 'Servicios', subNombre: 'Agua' },
  { pattern: /epec|bezzapay\*epec/i, catNombre: 'Servicios', subNombre: 'Luz' },
  { pattern: /telecom|claro|personal|movistar|celular/i, catNombre: 'Servicios', subNombre: 'Celular' },
  { pattern: /fibertel|flow|cablevision/i, catNombre: 'Entretenimientos', subNombre: 'Flow' },
  { pattern: /netflix/i, catNombre: 'Entretenimientos', subNombre: 'Netflix' },
  { pattern: /spotify/i, catNombre: 'Entretenimientos', subNombre: 'Spotify' },
  { pattern: /adt|alarma/i, catNombre: 'Servicios', subNombre: 'Alarma ADT' },

  // Profesional
  { pattern: /colegio de psicolog|caja de prev|consejo de medic|matricula|linkedin/i, catNombre: 'Profesional', subNombre: 'Matricula Porfesional' },

  // Salud
  { pattern: /swissmedical|swiss medical/i, catNombre: 'Salud', subNombre: 'Obra Social' },
  { pattern: /ecografia|medico|consultorio|dr\.|dra\./i, catNombre: 'Salud', subNombre: 'Medico/a' },
  { pattern: /farmacity|farmacia/i, catNombre: 'Salud', subNombre: 'Farmacia' },
  { pattern: /odontolog|dentista/i, catNombre: 'Salud', subNombre: 'Odontologia' },
  { pattern: /psicolog/i, catNombre: 'Salud', subNombre: 'Psicologia' },
  { pattern: /fonoaudiolog/i, catNombre: 'Salud', subNombre: 'Fonoaudiologia' },

  // Hogar y Familia
  { pattern: /utensili|ferreshop|ferreteria|pintureria|rex|merlino/i, catNombre: 'Hogar/Familia ', subNombre: 'Ferreteria' },
  { pattern: /patricia andrea zaragoza|limpieza/i, catNombre: 'Hogar/Familia ', subNombre: 'Limpieza' },
  { pattern: /libreria/i, catNombre: 'Hogar/Familia ', subNombre: 'Libreria' },

  // Vehículo y Transporte
  { pattern: /sube|sube viajes/i, catNombre: 'Vehiculo y Transporte', subNombre: 'Colectivo' },
  { pattern: /san cristobal|seguro auto/i, catNombre: 'Vehiculo y Transporte', subNombre: 'Seguro Auto' },
  { pattern: /suspension la esquina|taller|mecanic|alineacion|gomeria/i, catNombre: 'Vehiculo y Transporte', subNombre: 'Manteamiento/Service' },
  { pattern: /ypf|shell|axion|estac serv|combustible|nafta|bornoroni/i, catNombre: 'Vehiculo y Transporte', subNombre: 'Nafta' },
  { pattern: /cochera|estacionamiento/i, catNombre: 'Vehiculo y Transporte', subNombre: 'Cochera' },
  { pattern: /peaje|caminos de las sierras/i, catNombre: 'Vehiculo y Transporte', subNombre: 'Peajes' },
  { pattern: /uber|cabify|didi|taxi/i, catNombre: 'Vehiculo y Transporte', subNombre: 'Uber' },

  // Entretenimiento
  { pattern: /google one|google.*one/i, catNombre: 'Entretenimientos', subNombre: 'Google *google one a' },

  // Educación
  { pattern: /san jose|colegio|instituto san jose/i, catNombre: 'Educación ', subNombre: 'Colegio' },

  // Impuestos y Cargos de Tarjeta
  { pattern: /comision por mantenimiento|comisión por mantenimiento|tarjeta cordobesa|tarjeta visa|tarjeta amex|american express|impuesto de sellos|percep-cord|rg 4240|rg 5617|iibb percep|db\.rg/i, catNombre: 'Impuestos', subNombre: 'Tarjetas' },
  { pattern: /municipalidad de cordoba|tasa municipal/i, catNombre: 'Impuestos', subNombre: 'Impuesto Municipal' },
  { pattern: /dgr|rentas cordoba|impuesto inmobiliario/i, catNombre: 'Impuestos', subNombre: 'Impuesto Provincial' },
  { pattern: /afip|monotributo/i, catNombre: 'Impuestos', subNombre: 'Monotributo' },

  // Ingresos / Rescates de Inversión
  { pattern: /rescate|fondos comunes|supergestion/i, catNombre: 'Ingresos', subNombre: 'Rescate de fondos Santander' },
  { pattern: /balanz/i, catNombre: 'Ingresos', subNombre: 'Rescate Balanz' },
  { pattern: /rendimiento|capitaliz/i, catNombre: 'Ingresos', subNombre: 'Bonificaciones' },
  { pattern: /sec gral de la gobernacion|gobernacion/i, catNombre: 'Ingresos', subNombre: 'Sueldo Provincia' },
  { pattern: /otra esquina|fundacion otra esquina/i, catNombre: 'Ingresos', subNombre: 'Otra Esquina' },
  { pattern: /residencia sol de mendiolaza/i, catNombre: 'Ingresos', subNombre: 'Pacientes Consultorio' }
];

/**
 * Normaliza strings para comparaciones insensibles a acentos y mayúsculas
 */
export function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Clasifica una descripción dada usando primero las reglas guardadas en Firestore
 * y luego las reglas predeterminadas del sistema.
 */
export function clasificarMovimiento(descripcion, reglasFirestore = [], categorias = [], subcategorias = []) {
  const descNorm = normalizarTexto(descripcion);

  // 1. Probar reglas personalizadas guardadas por el usuario en Firestore
  for (const regla of reglasFirestore) {
    if (!regla.activo && regla.activo !== undefined) continue;
    const patronNorm = normalizarTexto(regla.patron);
    if (patronNorm && descNorm.includes(patronNorm)) {
      const cat = categorias.find(c => c.id === regla.categoriaId);
      const sub = subcategorias.find(s => s.id === regla.subcategoriaId);
      return {
        categoriaId: regla.categoriaId || '',
        subcategoriaId: regla.subcategoriaId || '',
        categoriaNombre: cat?.nombre || '',
        subcategoriaNombre: sub?.nombre || '',
        origenRegla: 'personalizada'
      };
    }
  }

  // 2. Probar reglas predeterminadas
  for (const regla of REGLAS_PREDETERMINADAS) {
    if (regla.pattern.test(descripcion)) {
      // Buscar la categoría real por nombre
      const cat = categorias.find(c => normalizarTexto(c.nombre) === normalizarTexto(regla.catNombre));
      if (cat) {
        const subNorm = normalizarTexto(regla.subNombre);
        const sub = subcategorias.find(s => {
          if (s.categoriaId !== cat.id) return false;
          const sNombreNorm = normalizarTexto(s.nombre);
          return sNombreNorm === subNorm || sNombreNorm.includes(subNorm) || subNorm.includes(sNombreNorm);
        });
        return {
          categoriaId: cat.id,
          subcategoriaId: sub ? sub.id : '',
          categoriaNombre: cat.nombre,
          subcategoriaNombre: sub ? sub.nombre : '',
          origenRegla: 'predeterminada'
        };
      }
    }
  }

  return {
    categoriaId: '',
    subcategoriaId: '',
    categoriaNombre: '',
    subcategoriaNombre: '',
    origenRegla: 'ninguna'
  };
}
