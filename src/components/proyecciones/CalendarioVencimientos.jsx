import { useMemo, useState } from 'react';
import { 
  Calendar, CreditCard, CheckCircle2, Clock, 
  TrendingUp, AlertCircle, ArrowRight, ShieldCheck, Search,
  ChevronRight, Filter, Sparkles, Check
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useData } from '../../context/DataContext';
import { cn } from '../../lib/utils';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getMesAnterior = (isoMes) => {
  if (!isoMes) return '';
  const [y, m] = isoMes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
};

const formatNombreMes = (isoMes) => {
  if (!isoMes) return '';
  const [y, m] = isoMes.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

export const CalendarioVencimientos = ({ mes, setMes }) => {
  const { 
    proyecciones, 
    tarjetas, 
    movimientos, 
    subcategorias, 
    categorias,
    updateTarjeta,
    updateProyeccion
  } = useData();

  const [filtroTexto, setFiltroTexto] = useState('');
  const [corteActivo, setCorteActivo] = useState('todos'); // 'todos' | 'corte1' | 'corte2' | 'resto'
  const [editandoDiaId, setEditandoDiaId] = useState(null);
  const [tempDia, setTempDia] = useState('');

  const mesAnterior = useMemo(() => getMesAnterior(mes), [mes]);
  const nombreMesActual = useMemo(() => formatNombreMes(mes), [mes]);

  // 0. PROYECCIONES QUE APLICAN AL MES SELECCIONADO
  const proyeccionesDelMes = useMemo(() => {
    return proyecciones.filter(p => p.mes === mes);
  }, [proyecciones, mes]);

  // 1. COMPROMISOS DE SERVICIOS Y GASTOS FIJOS (basado en las proyecciones activas de egreso de este mes)
  const compromisosFijos = useMemo(() => {
    const movsActuales = movimientos.filter(m => (m.fecha || '').startsWith(mes) && m.tipo === 'egreso' && m.contabiliza !== false);

    // Filtrar todas las proyecciones que correspondan a egreso
    const proysEgreso = proyeccionesDelMes.filter(p => {
      if (p.tipo) return p.tipo === 'egreso';
      const cat = categorias.find(c => c.id === p.categoriaId);
      return cat?.tipo === 'egreso';
    });

    return proysEgreso.map(p => {
      const sub = subcategorias.find(s => s.id === p.subcategoriaId);
      const cat = categorias.find(c => c.id === p.categoriaId);
      const monto = Number(p.montoProyectado !== undefined && p.montoProyectado !== null ? p.montoProyectado : (p.monto || 0));

      const diaVto = (p.diaVencimiento !== undefined && p.diaVencimiento !== null && p.diaVencimiento !== '')
        ? Number(p.diaVencimiento)
        : (sub?.diaVencimiento ? Number(sub.diaVencimiento) : null);

      const concepto = p.descripcion || sub?.nombre || cat?.nombre || 'Compromiso Fijo';

      // Detección de pago en los movimientos reales
      const pagadoMov = movsActuales.find(m => {
        // 1. Coincidencia exacta por ID de proyección
        if (m.proyeccionId === p.id) return true;

        // 2. Si ambos tienen responsable y difiere, no coinciden
        if (p.responsable && m.responsable && p.responsable.toLowerCase() !== m.responsable.toLowerCase()) {
          return false;
        }

        // 3. Coincidencia por subcategoría
        if (p.subcategoriaId && m.subcategoriaId === p.subcategoriaId) {
          if (p.descripcion && m.descripcion) {
            const descP = p.descripcion.toLowerCase().trim();
            const descM = m.descripcion.toLowerCase().trim();
            if (descM.includes(descP) || descP.includes(descM)) return true;
          }
          return true;
        }

        // 4. Coincidencia por texto en la descripción
        if (p.descripcion && m.descripcion && m.descripcion.toLowerCase().includes(p.descripcion.toLowerCase().trim())) {
          return true;
        }

        return false;
      });

      const esTarjeta = Boolean(
        cat?.nombre?.toLowerCase().includes('tarjeta') ||
        sub?.nombre?.toLowerCase().includes('tarjeta') ||
        concepto.toLowerCase().includes('tarjeta')
      );

      return {
        id: p.id,
        esProyeccion: true,
        proyeccionId: p.id,
        tipoElemento: esTarjeta ? 'tarjeta' : (p.tipoGasto === 'variable' ? 'variable' : 'fijo'),
        dia: diaVto,
        concepto,
        responsable: p.responsable || null,
        subcategoriaNombre: sub?.nombre || '',
        categoriaNombre: cat?.nombre || (esTarjeta ? 'Tarjeta' : 'Presupuesto'),
        icono: cat?.icono || (esTarjeta ? '💳' : '📅'),
        monto,
        pagado: Boolean(pagadoMov),
        fechaPago: pagadoMov?.fecha || null,
        montoPagado: pagadoMov ? Number(pagadoMov.monto) : null
      };
    }).filter(item => item.monto > 0);
  }, [proyeccionesDelMes, subcategorias, categorias, movimientos, mes]);

  // 2. COMPROMISOS DE RESÚMENES DE TARJETAS (Solo si NO fueron ya proyectadas explícitamente por el usuario)
  const compromisosTarjetas = useMemo(() => {
    const cards = (tarjetas || []).filter(t => {
      if (t.activa === false) return false;
      const nom = (t.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esCordobesa = nom.includes('cordobe');
      const esVisa = nom.includes('visa');
      const esMaster = nom.includes('master');
      return esCordobesa || esVisa || esMaster;
    });

    // Descartar tarjetas que el usuario ya cargó en sus proyecciones de egreso para evitar duplicados
    const cardsSinProyeccion = cards.filter(t => {
      const nomT = (t.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const yaExiste = compromisosFijos.some(f => {
        const c = (f.concepto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const s = (f.subcategoriaNombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (nomT.includes('cordobe') && (c.includes('cordobe') || s.includes('cordobe'))) return true;
        if (nomT.includes('visa') && (c.includes('visa') || s.includes('visa'))) return true;
        if (nomT.includes('master') && (c.includes('master') || s.includes('master'))) return true;
        return c.includes(nomT) || s.includes(nomT);
      });
      return !yaExiste;
    });

    return cardsSinProyeccion.map(t => {
      const nom = (t.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const esCordobesa = nom.includes('cordobe');
      const esVisa = nom.includes('visa');

      // Consumos del período anterior
      const movsResumen = movimientos.filter(m => 
        (m.tarjeta === t.id || (m.tarjeta && m.tarjeta.toLowerCase() === t.nombre?.toLowerCase())) && 
        (m.fecha || '').startsWith(mesAnterior) && 
        m.tipo === 'egreso' && 
        m.contabiliza !== false
      );

      // Cuotas del mes actual
      const cuotasMes = movimientos.filter(m => 
        (m.tarjeta === t.id || (m.tarjeta && m.tarjeta.toLowerCase() === t.nombre?.toLowerCase())) && 
        m.esCuota === true && 
        (m.fecha || '').startsWith(mes) && 
        m.tipo === 'egreso' && 
        m.contabiliza !== false
      );

      const total = movsResumen.reduce((acc, m) => acc + Number(m.monto || 0), 0) +
                    cuotasMes.reduce((acc, m) => acc + Number(m.monto || 0), 0);

      // Pago del resumen en el mes actual
      const pagoResumenMov = movimientos.find(m => 
        (m.fecha || '').startsWith(mes) && 
        m.tipo === 'egreso' && 
        ((m.descripcion && m.descripcion.toLowerCase().includes('pago') && m.descripcion.toLowerCase().includes(t.nombre.toLowerCase())) ||
         (m.comentario && m.comentario.toLowerCase().includes('resumen') && m.tarjeta === t.id))
      );

      const defaultDia = esCordobesa ? 10 : (esVisa ? 12 : 12);
      const diaVto = t.diaVencimiento ? Number(t.diaVencimiento) : defaultDia;

      return {
        id: `tarjeta_${t.id}`,
        tarjetaId: t.id,
        tipoElemento: 'tarjeta',
        dia: diaVto,
        concepto: t.nombre,
        responsable: null,
        subcategoriaNombre: 'Resumen Tarjeta',
        categoriaNombre: 'Tarjeta de Crédito',
        icono: '💳',
        monto: total,
        cantidadMovs: movsResumen.length,
        cantidadCuotas: cuotasMes.length,
        pagado: Boolean(pagoResumenMov),
        fechaPago: pagoResumenMov?.fecha || null
      };
    }).filter(t => t.monto > 0 || t.dia);
  }, [tarjetas, compromisosFijos, movimientos, mesAnterior, mes]);

  // 3. UNIFICACIÓN Y ORDENAMIENTO CRONOLÓGICO
  const listaUnificada = useMemo(() => {
    const unificados = [...compromisosFijos, ...compromisosTarjetas];
    unificados.sort((a, b) => {
      if (!a.dia) return 1;
      if (!b.dia) return -1;
      return a.dia - b.dia;
    });
    return unificados;
  }, [compromisosFijos, compromisosTarjetas]);

  // 4. AGRUPACIÓN EN LOS 2 CORTES PRINCIPALES (1 al 10 y 10 al 20) + Resto
  const { 
    itemsCorte1, 
    itemsCorte2, 
    itemsResto, 
    itemsSinDia,
    totalCorte1, 
    pagadoCorte1, 
    pendienteCorte1,
    totalCorte2, 
    pagadoCorte2, 
    pendienteCorte2,
    totalResto,
    pagadoResto,
    totalMesGeneral,
    totalPagadoGeneral,
    totalPendienteGeneral
  } = useMemo(() => {
    const c1 = [];
    const c2 = [];
    const resto = [];
    const sinDia = [];

    listaUnificada.forEach(item => {
      if (!item.dia) {
        sinDia.push(item);
      } else if (item.dia <= 10) {
        c1.push(item);
      } else if (item.dia <= 20) {
        c2.push(item);
      } else {
        resto.push(item);
      }
    });

    const sum = (arr) => arr.reduce((acc, it) => acc + (it.monto || 0), 0);
    const sumPagado = (arr) => arr.reduce((acc, it) => acc + (it.pagado ? it.monto : 0), 0);

    const totC1 = sum(c1);
    const pagC1 = sumPagado(c1);
    const totC2 = sum(c2);
    const pagC2 = sumPagado(c2);
    const totR = sum(resto);
    const pagR = sumPagado(resto);

    const totGen = totC1 + totC2 + totR + sum(sinDia);
    const pagGen = pagC1 + pagC2 + pagR + sumPagado(sinDia);

    return {
      itemsCorte1: c1,
      itemsCorte2: c2,
      itemsResto: resto,
      itemsSinDia: sinDia,
      totalCorte1: totC1,
      pagadoCorte1: pagC1,
      pendienteCorte1: Math.max(0, totC1 - pagC1),
      totalCorte2: totC2,
      pagadoCorte2: pagC2,
      pendienteCorte2: Math.max(0, totC2 - pagC2),
      totalResto: totR,
      pagadoResto: pagR,
      totalMesGeneral: totGen,
      totalPagadoGeneral: pagGen,
      totalPendienteGeneral: Math.max(0, totGen - pagGen)
    };
  }, [listaUnificada]);

  // 5. ANÁLISIS DE COBERTURA DE INGRESOS PARA EL 1° CORTE (AL DÍA 10)
  const coberturaCorte1 = useMemo(() => {
    const proysIngreso = proyeccionesDelMes.filter(p => {
      if (p.tipo) return p.tipo === 'ingreso';
      const cat = categorias.find(c => c.id === p.categoriaId);
      return cat?.tipo === 'ingreso';
    });

    const esPacientes = (item) => {
      const sub = subcategorias.find(s => s.id === item.subcategoriaId);
      const text = `${item.descripcion || ''} ${sub?.nombre || ''}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return text.includes('paciente') || text.includes('consultorio');
    };

    const getMonto = (item) => Number(item.montoProyectado !== undefined && item.montoProyectado !== null ? item.montoProyectado : (item.monto || 0));

    const proysPacientes = proysIngreso.filter(esPacientes);
    const proysBase = proysIngreso.filter(item => !esPacientes(item));

    const pacientesProy = proysPacientes.reduce((acc, p) => acc + getMonto(p), 0);
    const ingresosBase = proysBase.reduce((acc, p) => acc + getMonto(p), 0);
    const brechaPacientes = Math.max(0, totalCorte1 - ingresosBase);

    // Nombres o etiquetas de ingresos base para mostrar en la interfaz
    const detalleBase = proysBase.map(p => {
      const sub = subcategorias.find(s => s.id === p.subcategoriaId);
      return p.descripcion || sub?.nombre || 'Ingreso';
    }).join(' + ');

    // Movimientos reales de cobro de pacientes en el mes
    const cobradoPacientesReal = movimientos
      .filter(m => 
        (m.fecha || '').startsWith(mes) && 
        m.tipo === 'ingreso' && 
        m.contabiliza !== false &&
        ((m.descripcion || '').toLowerCase().includes('paciente') || 
         (m.comentario || '').toLowerCase().includes('paciente') ||
         (subcategorias.find(s => s.id === m.subcategoriaId)?.nombre || '').toLowerCase().includes('paciente'))
      )
      .reduce((acc, m) => acc + Number(m.monto || 0), 0);

    const restantePacientes = Math.max(0, brechaPacientes - cobradoPacientesReal);

    return {
      ingresosBase,
      detalleBase: detalleBase || 'Ingresos fijos',
      pacientesProy,
      brechaPacientes,
      cobradoPacientesReal,
      restantePacientes
    };
  }, [proyeccionesDelMes, subcategorias, categorias, movimientos, mes, totalCorte1]);

  // Guardar cambio rápido de día
  const handleGuardarDia = async (item, nuevoDia) => {
    const diaNum = nuevoDia !== '' && nuevoDia !== null ? Number(nuevoDia) : null;
    if (diaNum < 1 || diaNum > 31) return;

    if (item.tipoElemento === 'tarjeta') {
      await updateTarjeta(item.tarjetaId, { diaVencimiento: diaNum });
    } else if (item.esProyeccion && item.proyeccionId) {
      await updateProyeccion(item.proyeccionId, { diaVencimiento: diaNum });
    }
    setEditandoDiaId(null);
  };

  // Filtrador por texto
  const aplicarFiltroTexto = (lista) => {
    if (!filtroTexto) return lista;
    const t = filtroTexto.toLowerCase();
    return lista.filter(it => 
      (it.concepto || '').toLowerCase().includes(t) ||
      (it.categoriaNombre || '').toLowerCase().includes(t) ||
      (it.subcategoriaNombre || '').toLowerCase().includes(t)
    );
  };

  const listaFiltradaC1 = useMemo(() => aplicarFiltroTexto(itemsCorte1), [itemsCorte1, filtroTexto]);
  const listaFiltradaC2 = useMemo(() => aplicarFiltroTexto(itemsCorte2), [itemsCorte2, filtroTexto]);
  const listaFiltradaResto = useMemo(() => aplicarFiltroTexto(itemsResto), [itemsResto, filtroTexto]);
  const listaFiltradaSinDia = useMemo(() => aplicarFiltroTexto(itemsSinDia), [itemsSinDia, filtroTexto]);

  // Renderizador de tabla común para evitar redundancia
  const renderTablaCompromisos = (items, tramoNombre, badgeClass) => {
    if (items.length === 0) {
      return (
        <div className="py-8 text-center text-muted-foreground text-xs italic bg-slate-50/50 rounded-lg border border-dashed">
          No hay compromisos registrados en este tramo.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80 text-muted-foreground text-[11px] uppercase font-bold tracking-wider">
              <th className="py-2.5 px-4 text-center w-[90px]">Día Vto.</th>
              <th className="py-2.5 px-4 text-left">Obligación / Compromiso</th>
              <th className="py-2.5 px-4 text-left w-[130px]">Tipo</th>
              <th className="py-2.5 px-4 text-right w-[160px]">Monto</th>
              <th className="py-2.5 px-4 text-center w-[120px]">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map(item => {
              const estaEditando = editandoDiaId === item.id;

              return (
                <tr 
                  key={item.id} 
                  className={cn(
                    "transition-colors hover:bg-slate-50/70",
                    item.pagado ? "bg-emerald-50/20 text-slate-500" : ""
                  )}
                >
                  {/* DÍA DE VENCIMIENTO (Editable al clic) */}
                  <td className="py-2.5 px-4 text-center">
                    {estaEditando ? (
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          autoFocus
                          className="w-12 px-1 py-0.5 text-xs font-bold border rounded text-center outline-none ring-2 ring-indigo-500"
                          value={tempDia}
                          onChange={(e) => setTempDia(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleGuardarDia(item, tempDia);
                            if (e.key === 'Escape') setEditandoDiaId(null);
                          }}
                        />
                        <button
                          type="button"
                          className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => handleGuardarDia(item, tempDia)}
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoDiaId(item.id);
                          setTempDia(item.dia ? String(item.dia) : '');
                        }}
                        title="Clic para cambiar día de vencimiento"
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-black shadow-2xs border transition-transform hover:scale-105 cursor-pointer",
                          badgeClass
                        )}
                      >
                        {item.dia ? `Día ${String(item.dia).padStart(2, '0')}` : 'Sin día'}
                      </button>
                    )}
                  </td>

                  {/* CONCEPTO */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{item.icono}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-bold text-sm block",
                            item.pagado ? "line-through text-slate-500" : "text-slate-800"
                          )}>
                            {item.concepto}
                          </span>
                          {item.responsable && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {item.responsable}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {item.tipoElemento === 'tarjeta' && item.cantidadMovs !== undefined ? (
                            <span>{item.cantidadMovs || 0} consumos {item.cantidadCuotas > 0 ? `+ ${item.cantidadCuotas} cuotas` : ''}</span>
                          ) : (
                            <span>{item.categoriaNombre} {item.subcategoriaNombre ? `• ${item.subcategoriaNombre}` : ''}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* TIPO */}
                  <td className="py-2.5 px-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border tracking-wider",
                      item.tipoElemento === 'tarjeta' 
                        ? "bg-purple-50 text-purple-700 border-purple-200" 
                        : (item.tipoElemento === 'variable'
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200")
                    )}>
                      {item.tipoElemento === 'tarjeta' 
                        ? 'Tarjeta' 
                        : (item.tipoElemento === 'variable' ? 'Presupuesto Var.' : 'Fijo / Servicio')}
                    </span>
                  </td>

                  {/* MONTO */}
                  <td className="py-2.5 px-4 text-right">
                    <span className={cn(
                      "font-black text-sm",
                      item.pagado ? "text-slate-500" : "text-slate-900"
                    )}>
                      {fmt(item.monto)}
                    </span>
                  </td>

                  {/* ESTADO */}
                  <td className="py-2.5 px-4 text-center">
                    {item.pagado ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Clock className="h-3 w-3" /> Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. CABECERA: TÍTULO Y SELECTOR DE MES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Cortes de Liquidez y Vencimientos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organizado en dos cortes estratégicos: del 1 al 10 y del 10 al 20 para {nombreMesActual}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Mes Evaluado</span>
            <input 
              type="month" 
              className="p-2 border rounded-md bg-background text-sm font-bold shadow-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. LOS DOS CORTES PRINCIPALES (TARJETAS HERO PROTAGONISTAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* ========================================================= */}
        {/* CORTE 1: DEL 1 AL 10                                      */}
        {/* ========================================================= */}
        <Card className="border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500" />
          <CardContent className="p-5 space-y-4">
            {/* Header del Corte 1 */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <Clock className="h-3.5 w-3.5" /> 1° Corte: Días 1 al 10
                </span>
                <p className="text-[11px] text-amber-900/70 font-medium mt-1">
                  Colegios, Swiss Medical, Flow, Arte, Gym y Tarjeta Cordobesa
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-amber-900/80 bg-amber-100 px-2 py-0.5 rounded-md">
                  {itemsCorte1.filter(i => i.pagado).length} de {itemsCorte1.length} pagados
                </span>
              </div>
            </div>

            {/* Monto Central del Corte 1 */}
            <div className="p-4 bg-white/90 border border-amber-200 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                Total a Pagar al Día 10
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span className="text-3xl font-black text-amber-950 tracking-tight">
                  {fmt(totalCorte1)}
                </span>
                {pendienteCorte1 > 0 && pendienteCorte1 < totalCorte1 && (
                  <span className="text-xs font-bold text-amber-700">
                    Resta: {fmt(pendienteCorte1)}
                  </span>
                )}
              </div>
            </div>

            {/* Análisis de Cobertura con Sueldos y Pacientes */}
            <div className="p-3.5 bg-amber-100/60 border border-amber-200/90 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <div>
                  <span className="font-bold text-slate-800 block">Ingresos Base Fijos / Previsibles:</span>
                  <span className="text-[10px] text-amber-900/70 truncate max-w-[260px] block" title={coberturaCorte1.detalleBase}>
                    {coberturaCorte1.detalleBase}
                  </span>
                </div>
                <strong className="text-slate-900 font-bold text-sm">+{fmt(coberturaCorte1.ingresosBase)}</strong>
              </div>

              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-950 block">Necesitás de Pacientes al día 10:</span>
                  <span className="text-[10px] text-amber-800">Para cubrir la diferencia del 1° corte</span>
                </div>
                <span className="text-lg font-black text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                  {fmt(coberturaCorte1.brechaPacientes)}
                </span>
              </div>

              {coberturaCorte1.cobradoPacientesReal > 0 && (
                <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-md border border-emerald-200 flex items-center justify-between">
                  <span>✓ Pacientes ya cobrados en el mes:</span>
                  <span>{fmt(coberturaCorte1.cobradoPacientesReal)} (Faltan {fmt(coberturaCorte1.restantePacientes)})</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* CORTE 2: DEL 10 AL 20                                     */}
        {/* ========================================================= */}
        <Card className="border-indigo-300 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />
          <CardContent className="p-5 space-y-4">
            {/* Header del Corte 2 */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-indigo-200/80 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-300">
                  <CreditCard className="h-3.5 w-3.5" /> 2° Corte: Días 10 al 20
                </span>
                <p className="text-[11px] text-indigo-900/70 font-medium mt-1">
                  Tarjeta Visa, Tarjeta Master, Fútbol Agus, Gas y servicios de quincena
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-indigo-900/80 bg-indigo-100 px-2 py-0.5 rounded-md">
                  {itemsCorte2.filter(i => i.pagado).length} de {itemsCorte2.length} pagados
                </span>
              </div>
            </div>

            {/* Monto Central del Corte 2 */}
            <div className="p-4 bg-white/90 border border-indigo-200 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
                Total a Pagar del 10 al 20
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span className="text-3xl font-black text-indigo-950 tracking-tight">
                  {fmt(totalCorte2)}
                </span>
                {pendienteCorte2 > 0 && pendienteCorte2 < totalCorte2 && (
                  <span className="text-xs font-bold text-indigo-700">
                    Resta: {fmt(pendienteCorte2)}
                  </span>
                )}
              </div>
            </div>

            {/* Cobertura del Corte 2 */}
            <div className="p-3.5 bg-indigo-100/60 border border-indigo-200/90 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium">Fuente principal de financiamiento:</span>
                <strong className="text-indigo-950 font-bold">Pacientes (2° Quincena)</strong>
              </div>

              <div className="pt-2 border-t border-indigo-200/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-950 block">Compromisos clave:</span>
                  <span className="text-[10px] text-indigo-800">
                    Visa, Master, Fútbol, Gas
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                  {itemsCorte2.length} obligaciones
                </span>
              </div>

              <div className="text-[11px] text-indigo-900 bg-white/80 p-2 rounded-md border border-indigo-100">
                💡 Este corte se abastece con los ingresos profesionales generados a lo largo del mes.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. BARRA CONSOLIDADA DE LIQUIDEZ Y FIN DE MES */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-700">Resumen Mensual:</span>
          <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> 1° Corte: {fmt(totalCorte1)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-indigo-800 font-semibold">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> 2° Corte: {fmt(totalCorte2)}
          </span>
          {totalResto > 0 && (
            <span className="inline-flex items-center gap-1.5 text-slate-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Resto (21 al 31): {fmt(totalResto)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
          <span>Total Compromisos:</span>
          <span className="bg-white px-2.5 py-0.5 rounded-md border shadow-2xs text-rose-700">
            {fmt(totalMesGeneral)}
          </span>
        </div>
      </div>

      {/* 4. BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Selector de pestañas por corte */}
        <div className="inline-flex p-1 bg-muted rounded-lg text-xs font-bold">
          <button
            type="button"
            onClick={() => setCorteActivo('todos')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all",
              corteActivo === 'todos' ? "bg-background text-foreground shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Ambos Cortes ({itemsCorte1.length + itemsCorte2.length})
          </button>
          <button
            type="button"
            onClick={() => setCorteActivo('corte1')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1",
              corteActivo === 'corte1' ? "bg-amber-100 text-amber-900 shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clock className="h-3 w-3 text-amber-600" /> 1° Corte (1 al 10)
          </button>
          <button
            type="button"
            onClick={() => setCorteActivo('corte2')}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1",
              corteActivo === 'corte2' ? "bg-indigo-100 text-indigo-900 shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CreditCard className="h-3 w-3 text-indigo-600" /> 2° Corte (10 al 20)
          </button>
          {itemsResto.length > 0 && (
            <button
              type="button"
              onClick={() => setCorteActivo('resto')}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all",
                corteActivo === 'resto' ? "bg-background text-foreground shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Resto (21 al 31)
            </button>
          )}
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por concepto o categoría..."
            className="pl-8 pr-3 py-1.5 text-xs border rounded-md bg-background w-full sm:w-[220px]"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
      </div>

      {/* 5. TABLAS SEPARADAS POR CORTE (PARA EVITAR CONFUSIÓN Y MAREOS) */}
      <div className="space-y-6">

        {/* BLOQUE SECCIÓN: 1° CORTE (DÍAS 1 AL 10) */}
        {(corteActivo === 'todos' || corteActivo === 'corte1') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
                  1° Corte: Compromisos del 1 al 10
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  ({listaFiltradaC1.length} compromisos)
                </span>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-200">
                Subtotal: {fmt(totalCorte1)}
              </span>
            </div>

            {renderTablaCompromisos(
              listaFiltradaC1, 
              '1° Corte', 
              'bg-amber-100 text-amber-900 border-amber-300'
            )}
          </div>
        )}

        {/* BLOQUE SECCIÓN: 2° CORTE (DÍAS 10 AL 20) */}
        {(corteActivo === 'todos' || corteActivo === 'corte2') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight">
                  2° Corte: Compromisos del 10 al 20
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  ({listaFiltradaC2.length} compromisos)
                </span>
              </div>
              <span className="text-xs font-bold text-indigo-900 bg-indigo-100 px-2.5 py-0.5 rounded-md border border-indigo-200">
                Subtotal: {fmt(totalCorte2)}
              </span>
            </div>

            {renderTablaCompromisos(
              listaFiltradaC2, 
              '2° Corte', 
              'bg-indigo-100 text-indigo-900 border-indigo-300'
            )}
          </div>
        )}

        {/* BLOQUE SECCIÓN: RESTO DEL MES (DÍAS 21 AL 31) */}
        {(corteActivo === 'todos' || corteActivo === 'resto') && itemsResto.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-400" />
                <h3 className="font-extrabold text-sm text-slate-700 tracking-tight">
                  Fin de Mes: Compromisos del 21 al 31
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  ({listaFiltradaResto.length} compromisos)
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                Subtotal: {fmt(totalResto)}
              </span>
            </div>

            {renderTablaCompromisos(
              listaFiltradaResto, 
              'Fin de Mes', 
              'bg-slate-100 text-slate-800 border-slate-300'
            )}
          </div>
        )}

        {/* ITEMS SIN DÍA ASIGNADO (SI HUBIERA) */}
        {itemsSinDia.length > 0 && (
          <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-200/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span>Hay {itemsSinDia.length} compromiso(s) sin día de vencimiento asignado:</span>
            </div>
            {renderTablaCompromisos(
              listaFiltradaSinDia, 
              'Sin día', 
              'bg-slate-200 text-slate-800 border-slate-300'
            )}
          </div>
        )}

      </div>
    </div>
  );
};
