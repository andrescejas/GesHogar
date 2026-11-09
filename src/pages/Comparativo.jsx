import { Fragment, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Search, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

const getMesAnterior = (mesStr) => {
  if (!mesStr) return '';
  const [year, month] = mesStr.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  const prevYear = date.getFullYear();
  const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
};

const getMesSiguiente = (mesStr) => {
  if (!mesStr) return '';
  const [year, month] = mesStr.split('-').map(Number);
  const date = new Date(year, month, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
};

const getNombreMes = (mesStr, incluirAnio = true) => {
  if (!mesStr) return '';
  const [year, month] = mesStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const nombre = date.toLocaleString('es-AR', { 
    month: 'long', 
    year: incluirAnio ? 'numeric' : undefined 
  });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
};

const Comparativo = () => {
  const { categorias, subcategorias, movimientos, proyecciones } = useData();
  
  // Pestaña activa: 'mom' (Mes vs Mes Anterior) o 'presupuesto' (Previsto vs Real)
  const [tabActiva, setTabActiva] = useState('mom');
  
  // Mes base de análisis (por defecto el mes actual)
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const mesAnterior = useMemo(() => getMesAnterior(mes), [mes]);

  // Filtros para la vista MoM
  const [tipoFiltro, setTipoFiltro] = useState('egreso'); // 'egreso' | 'ingreso' | 'todos'
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'mas' | 'menos' | 'igual' | 'nada' | 'nuevo'

  // Navegación rápida de meses
  const irMesAnterior = () => setMes(prev => getMesAnterior(prev));
  const irMesSiguiente = () => setMes(prev => getMesSiguiente(prev));

  // ==========================================
  // 1. LÓGICA TABS 1: PREVISTO VS REAL (Original)
  // ==========================================
  const comparativaPresupuesto = useMemo(() => {
    return categorias.map(cat => {
      const subsCat = subcategorias.filter(s => s.categoriaId === cat.id);
      const subs = [...subsCat, { id: 'sin-sub', nombre: 'Sin Subcategoría', categoriaId: cat.id }];

      const subDetails = subs.map(sub => {
        const isSinSub = sub.id === 'sin-sub';
        
        const proyFisica = proyecciones
          .filter(p => {
            const matchCat = p.categoriaId === cat.id;
            const matchSub = isSinSub 
              ? (!p.subcategoriaId || !subsCat.some(s => s.id === p.subcategoriaId)) 
              : p.subcategoriaId === sub.id;
            if (!matchCat || !matchSub) return false;
            return p.mes === mes;
          })
          .reduce((acc, p) => acc + Number(p.montoProyectado !== undefined && p.montoProyectado !== null ? p.montoProyectado : (p.monto || 0)), 0);
          
        const proy = proyFisica;
          
        const real = movimientos
          .filter(m => 
            (m.categoriaId === cat.id || m.categoria === cat.nombre) && 
            m.fecha && m.fecha.startsWith(mes) && 
            m.estado !== 'proyectado' && 
            (isSinSub ? (!m.subcategoriaId || !subsCat.some(s => s.id === m.subcategoriaId)) : (m.subcategoriaId === sub.id || m.subcategoria === sub.nombre)) &&
            m.contabiliza !== false
          )
          .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
          
        const diferencia = cat.tipo === 'ingreso' ? real - proy : proy - real;
        const porcentaje = proy > 0 ? (real / proy) * 100 : 0;
        
        return {
          ...sub,
          proyectado: proy,
          real,
          diferencia,
          porcentaje
        };
      }).filter(s => s.proyectado > 0 || s.real > 0);

      const proyectado = subDetails.reduce((acc, s) => acc + s.proyectado, 0);
      const real = subDetails.reduce((acc, s) => acc + s.real, 0);
      const diferencia = cat.tipo === 'ingreso' ? real - proyectado : proyectado - real;
      const porcentaje = proyectado > 0 ? (real / proyectado) * 100 : 0;

      return {
        ...cat,
        proyectado,
        real,
        diferencia,
        porcentaje,
        subDetails
      };
    }).filter(c => c.proyectado > 0 || c.real > 0);
  }, [categorias, subcategorias, movimientos, proyecciones, mes]);

  const totalIngresosProyectado = comparativaPresupuesto.filter(c => c.tipo === 'ingreso').reduce((acc, c) => acc + c.proyectado, 0);
  const totalIngresosReal = comparativaPresupuesto.filter(c => c.tipo === 'ingreso').reduce((acc, c) => acc + c.real, 0);
  const totalGastosProyectado = comparativaPresupuesto.filter(c => c.tipo === 'egreso').reduce((acc, c) => acc + c.proyectado, 0);
  const totalGastosReal = comparativaPresupuesto.filter(c => c.tipo === 'egreso').reduce((acc, c) => acc + c.real, 0);

  const ahorroReal = totalIngresosReal - totalGastosReal;
  const ahorroProyectado = totalIngresosProyectado - totalGastosProyectado;
  const diferenciaAhorro = ahorroReal - ahorroProyectado;


  // ==========================================
  // 2. LÓGICA TABS 2: MES VS MES ANTERIOR (MoM)
  // ==========================================
  const comparativaMoM = useMemo(() => {
    const catsFiltradas = tipoFiltro === 'todos' 
      ? categorias 
      : categorias.filter(c => c.tipo === tipoFiltro);

    return catsFiltradas.map(cat => {
      const subsCat = subcategorias.filter(s => s.categoriaId === cat.id);
      const subs = [...subsCat, { id: 'sin-sub', nombre: 'Sin Subcategoría', categoriaId: cat.id }];

      const subDetails = subs.map(sub => {
        const isSinSub = sub.id === 'sin-sub';
        
        const filterMov = (m, targetMes) => {
          const matchFecha = m.fecha && m.fecha.startsWith(targetMes);
          const matchContabiliza = m.contabiliza !== false;
          const matchEstado = m.estado !== 'proyectado';
          const matchTipo = tipoFiltro === 'todos' ? (m.tipo === cat.tipo) : (m.tipo === tipoFiltro);
          const matchCat = m.categoriaId === cat.id || m.categoria === cat.nombre;
          const matchSub = isSinSub 
            ? (!m.subcategoriaId || !subsCat.some(s => s.id === m.subcategoriaId)) 
            : (m.subcategoriaId === sub.id || m.subcategoria === sub.nombre);
          return matchFecha && matchContabiliza && matchEstado && matchTipo && matchCat && matchSub;
        };

        const montoActual = movimientos
          .filter(m => filterMov(m, mes))
          .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

        const montoAnterior = movimientos
          .filter(m => filterMov(m, mesAnterior))
          .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

        const diferencia = montoActual - montoAnterior;
        
        let porcentaje = null;
        if (montoAnterior > 0) {
          porcentaje = ((montoActual - montoAnterior) / montoAnterior) * 100;
        }

        const esEgreso = cat.tipo === 'egreso';
        let estadoClave = 'igual';
        let estadoLabel = esEgreso ? 'Gastó igual' : 'Ingresó igual';
        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

        if (montoAnterior === 0 && montoActual > 0) {
          estadoClave = 'nuevo';
          estadoLabel = esEgreso ? 'Nuevo gasto' : 'Nuevo ingreso';
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        } else if (montoAnterior > 0 && montoActual === 0) {
          estadoClave = 'nada';
          estadoLabel = esEgreso ? 'Sin gasto' : 'Sin ingreso';
          badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
        } else if (diferencia > 0) {
          estadoClave = 'mas';
          estadoLabel = esEgreso ? 'Gastó más' : 'Ingresó más';
          badgeClass = esEgreso ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';
        } else if (diferencia < 0) {
          estadoClave = 'menos';
          estadoLabel = esEgreso ? 'Gastó menos' : 'Ingresó menos';
          badgeClass = esEgreso ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300';
        }

        return {
          ...sub,
          montoActual,
          montoAnterior,
          diferencia,
          porcentaje,
          estadoClave,
          estadoLabel,
          badgeClass
        };
      }).filter(s => {
        // Filtrar subcategorías en $0 en ambos meses
        if (s.montoActual === 0 && s.montoAnterior === 0) return false;
        
        // Filtro de búsqueda por texto
        if (filtroTexto.trim()) {
          const matchTexto = s.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) || 
                             cat.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
          if (!matchTexto) return false;
        }

        // Filtro por estado
        if (filtroEstado !== 'todos' && s.estadoClave !== filtroEstado) {
          return false;
        }

        return true;
      });

      const montoActual = subDetails.reduce((acc, s) => acc + s.montoActual, 0);
      const montoAnterior = subDetails.reduce((acc, s) => acc + s.montoAnterior, 0);
      const diferencia = montoActual - montoAnterior;
      
      let porcentaje = null;
      if (montoAnterior > 0) {
        porcentaje = ((montoActual - montoAnterior) / montoAnterior) * 100;
      }

      const esEgreso = cat.tipo === 'egreso';
      let estadoLabel = 'Igual';
      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
      if (montoAnterior === 0 && montoActual > 0) {
        estadoLabel = 'Nuevo';
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      } else if (montoAnterior > 0 && montoActual === 0) {
        estadoLabel = 'Sin actividad';
        badgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
      } else if (diferencia > 0) {
        estadoLabel = esEgreso ? 'Gastó más' : 'Ingresó más';
        badgeClass = esEgreso ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';
      } else if (diferencia < 0) {
        estadoLabel = esEgreso ? 'Gastó menos' : 'Ingresó menos';
        badgeClass = esEgreso ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300';
      }

      return {
        ...cat,
        montoActual,
        montoAnterior,
        diferencia,
        porcentaje,
        estadoLabel,
        badgeClass,
        subDetails
      };
    }).filter(c => c.montoActual > 0 || c.montoAnterior > 0);
  }, [categorias, subcategorias, movimientos, mes, mesAnterior, tipoFiltro, filtroTexto, filtroEstado]);

  // Totales MoM
  const totalMoMActual = useMemo(() => {
    return comparativaMoM.reduce((acc, c) => acc + c.montoActual, 0);
  }, [comparativaMoM]);

  const totalMoMAnterior = useMemo(() => {
    return comparativaMoM.reduce((acc, c) => acc + c.montoAnterior, 0);
  }, [comparativaMoM]);

  const diferenciaTotalMoM = totalMoMActual - totalMoMAnterior;
  const porcentajeTotalMoM = totalMoMAnterior > 0 
    ? ((totalMoMActual - totalMoMAnterior) / totalMoMAnterior) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal y Pestañas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Comparativo</h2>
          <p className="text-muted-foreground text-sm">
            {tabActiva === 'mom' 
              ? 'Análisis intermensual de consumos y variación de gastos por rubro.'
              : 'Análisis de desvío presupuestario entre lo previsto y lo real.'
            }
          </p>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => setTabActiva('mom')}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all flex items-center gap-1.5",
              tabActiva === 'mom' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Mes vs Mes Anterior
          </button>
          <button
            onClick={() => setTabActiva('presupuesto')}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all flex items-center gap-1.5",
              tabActiva === 'presupuesto' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Presupuesto vs Real
          </button>
        </div>
      </div>

      {/* Barra de Controles y Selector de Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={irMesAnterior}
            title="Mes anterior"
            className="p-2 border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <input 
              type="month" 
              className="p-1.5 px-3 border rounded-md bg-background text-sm font-semibold w-fit"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
            />
          </div>

          <button 
            onClick={irMesSiguiente}
            title="Mes siguiente"
            className="p-2 border rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {tabActiva === 'mom' && (
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l text-xs font-medium text-muted-foreground">
              <span>Comparando:</span>
              <span className="font-bold text-foreground bg-slate-100 px-2 py-0.5 rounded border">
                {getNombreMes(mes)}
              </span>
              <span>vs</span>
              <span className="font-bold text-muted-foreground bg-slate-50 px-2 py-0.5 rounded border">
                {getNombreMes(mesAnterior)}
              </span>
            </div>
          )}
        </div>

        {/* Controles específicos de la pestaña MoM */}
        {tabActiva === 'mom' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Tipo */}
            <div className="flex bg-muted p-0.5 rounded-md text-xs font-medium">
              <button
                onClick={() => setTipoFiltro('egreso')}
                className={cn(
                  "px-2.5 py-1 rounded transition-colors",
                  tipoFiltro === 'egreso' ? "bg-background text-rose-600 font-bold shadow-xs" : "text-muted-foreground"
                )}
              >
                Gastos
              </button>
              <button
                onClick={() => setTipoFiltro('ingreso')}
                className={cn(
                  "px-2.5 py-1 rounded transition-colors",
                  tipoFiltro === 'ingreso' ? "bg-background text-emerald-600 font-bold shadow-xs" : "text-muted-foreground"
                )}
              >
                Ingresos
              </button>
              <button
                onClick={() => setTipoFiltro('todos')}
                className={cn(
                  "px-2.5 py-1 rounded transition-colors",
                  tipoFiltro === 'todos' ? "bg-background text-foreground font-bold shadow-xs" : "text-muted-foreground"
                )}
              >
                Todos
              </button>
            </div>

            {/* Buscador Rápido */}
            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar subcategoría..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* VISTA 1: MES VS MES ANTERIOR (MoM)                        */}
      {/* ========================================================= */}
      {tabActiva === 'mom' && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen KPI */}
          <div className="grid gap-4 md:grid-cols-3">
            <ResumenCard 
              title={`Total ${tipoFiltro === 'egreso' ? 'Gastos' : tipoFiltro === 'ingreso' ? 'Ingresos' : 'Movimientos'} (${getNombreMes(mes)})`}
              value={totalMoMActual} 
              sub="Mes seleccionado"
              color={tipoFiltro === 'egreso' ? "text-rose-600" : "text-emerald-600"}
              icon={Calendar}
            />

            <ResumenCard 
              title={`Total ${tipoFiltro === 'egreso' ? 'Gastos' : tipoFiltro === 'ingreso' ? 'Ingresos' : 'Movimientos'} (${getNombreMes(mesAnterior)})`}
              value={totalMoMAnterior} 
              sub="Mes previo de referencia"
              color="text-slate-600"
              icon={Calendar}
            />

            <ResumenCard 
              title="Variación Neta" 
              value={diferenciaTotalMoM} 
              sub={
                totalMoMAnterior > 0 
                  ? `${porcentajeTotalMoM > 0 ? '+' : ''}${porcentajeTotalMoM.toFixed(1)}% respecto al mes anterior`
                  : 'Sin base previa'
              }
              color={
                tipoFiltro === 'egreso'
                  ? (diferenciaTotalMoM <= 0 ? "text-emerald-600" : "text-rose-600")
                  : (diferenciaTotalMoM >= 0 ? "text-emerald-600" : "text-rose-600")
              }
              icon={
                diferenciaTotalMoM > 0 ? TrendingUp : TrendingDown
              }
              showPlus={true}
            />
          </div>

          {/* Filtros rápidos por estado */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium mr-1">Filtrar estado:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'mas', label: 'Gastó más 🔴' },
              { id: 'menos', label: 'Gastó menos 🟢' },
              { id: 'igual', label: 'Gastó igual ⚪' },
              { id: 'nuevo', label: 'Nuevo rubro 🟡' },
              { id: 'nada', label: 'Sin gasto ⚪' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroEstado(f.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all",
                  filtroEstado === f.id 
                    ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                    : "bg-background text-muted-foreground hover:bg-muted border-border"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabla de Comparativa por Categoría y Subcategoría */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-base font-bold">
                  Detalle Comparativo por Categoría y Subcategoría
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Variación de montos entre {getNombreMes(mesAnterior)} y {getNombreMes(mes)}.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" /> Gastó menos / Ahorro
                </span>
                <span className="flex items-center gap-1 text-rose-600">
                  <div className="w-2 h-2 rounded-full bg-rose-500" /> Gastó más / Sobregasto
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 font-medium">
                      <th className="h-11 px-4 text-left align-middle text-muted-foreground">Categoría / Subcategoría</th>
                      <th className="h-11 px-4 text-right align-middle text-muted-foreground">
                        {getNombreMes(mesAnterior, false)}
                      </th>
                      <th className="h-11 px-4 text-right align-middle text-muted-foreground">
                        {getNombreMes(mes, false)}
                      </th>
                      <th className="h-11 px-4 text-right align-middle text-muted-foreground">Diferencia</th>
                      <th className="h-11 px-4 text-right align-middle text-muted-foreground">Variación (%)</th>
                      <th className="h-11 px-4 text-center align-middle text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {comparativaMoM.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-muted-foreground">
                          No se encontraron movimientos computables para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      comparativaMoM.map((c) => {
                        const esEgreso = c.tipo === 'egreso';
                        const difPositivaEsMala = esEgreso;
                        const esAhorro = c.diferencia < 0;

                        return (
                          <Fragment key={c.id}>
                            {/* Fila Encabezado de Categoría */}
                            <tr className="border-b transition-colors bg-muted/40 font-medium">
                              <td className="p-3.5 align-middle">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{c.icono}</span>
                                  <div>
                                    <span className="font-bold text-foreground">{c.nombre}</span>
                                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                      {c.tipo}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5 align-middle text-right text-muted-foreground font-semibold">
                                ${c.montoAnterior.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3.5 align-middle text-right font-black text-foreground">
                                ${c.montoActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={cn(
                                "p-3.5 align-middle text-right font-bold",
                                c.diferencia === 0 
                                  ? "text-muted-foreground" 
                                  : (esAhorro ? "text-emerald-600" : "text-rose-600")
                              )}>
                                {c.diferencia > 0 ? '+' : ''}${c.diferencia.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-3.5 align-middle text-right font-bold text-xs">
                                {c.porcentaje !== null ? (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded font-bold",
                                    c.porcentaje === 0
                                      ? "text-slate-600 bg-slate-100"
                                      : (c.porcentaje < 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")
                                  )}>
                                    {c.porcentaje > 0 ? '+' : ''}{c.porcentaje.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">—</span>
                                )}
                              </td>
                              <td className="p-3.5 align-middle text-center">
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                                  c.badgeClass
                                )}>
                                  {c.estadoLabel}
                                </span>
                              </td>
                            </tr>

                            {/* Filas de Subcategorías Hijas */}
                            {c.subDetails.map(sub => {
                              const subAhorro = sub.diferencia < 0;

                              return (
                                <tr key={sub.id} className="border-b transition-colors hover:bg-muted/30 text-sm">
                                  <td className="p-2.5 pl-9 align-middle text-foreground font-medium flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    <span>{sub.nombre}</span>
                                  </td>
                                  <td className="p-2.5 align-middle text-right text-muted-foreground font-normal">
                                    ${sub.montoAnterior.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2.5 align-middle text-right font-semibold">
                                    ${sub.montoActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className={cn(
                                    "p-2.5 align-middle text-right font-medium",
                                    sub.diferencia === 0 
                                      ? "text-slate-500" 
                                      : (subAhorro ? "text-emerald-600" : "text-rose-600")
                                  )}>
                                    {sub.diferencia > 0 ? '+' : ''}${sub.diferencia.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2.5 align-middle text-right text-xs">
                                    {sub.porcentaje !== null ? (
                                      <span className={cn(
                                        "font-semibold",
                                        sub.porcentaje === 0
                                          ? "text-slate-500"
                                          : (sub.porcentaje < 0 ? "text-emerald-600" : "text-rose-600")
                                      )}>
                                        {sub.porcentaje > 0 ? '+' : ''}{sub.porcentaje.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 align-middle text-center">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                      sub.badgeClass
                                    )}>
                                      {sub.estadoLabel}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: PRESUPUESTO VS REAL (Presupuesto Tradicional)    */}
      {/* ========================================================= */}
      {tabActiva === 'presupuesto' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ResumenCard 
              title="Ahorro Real" 
              value={ahorroReal} 
              sub="Resultado actual del mes"
              color="text-indigo-600"
              icon={ahorroReal >= 0 ? CheckCircle2 : AlertCircle}
            />
            <ResumenCard 
              title="Ahorro Proyectado" 
              value={ahorroProyectado} 
              sub="Tu meta para este mes"
              color="text-slate-600"
            />
            <ResumenCard 
              title="Diferencia" 
              value={diferenciaAhorro} 
              sub="Desvío sobre la meta"
              color={diferenciaAhorro >= 0 ? "text-emerald-600" : "text-rose-600"}
              showPlus={true}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Detalle por Categoría (Presupuesto vs Real)</CardTitle>
              <div className="flex gap-4 text-xs font-medium">
                <span className="flex items-center gap-1 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500" /> A favor</span>
                <span className="flex items-center gap-1 text-rose-600"><div className="w-2 h-2 rounded-full bg-rose-500" /> En contra</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 font-medium">
                      <th className="h-12 px-4 text-left align-middle text-muted-foreground">Categoría</th>
                      <th className="h-12 px-4 text-right align-middle text-muted-foreground">Proyectado</th>
                      <th className="h-12 px-4 text-right align-middle text-muted-foreground">Real</th>
                      <th className="h-12 px-4 text-right align-middle text-muted-foreground">Diferencia</th>
                      <th className="h-12 px-4 text-center align-middle text-muted-foreground">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {comparativaPresupuesto.map((c) => (
                      <Fragment key={c.id}>
                        <tr className="border-b transition-colors bg-muted/20">
                          <td className="p-4 align-middle">
                            <div className="flex flex-col">
                              <span className="font-semibold">{c.icono} {c.nombre}</span>
                              <span className="text-[10px] uppercase text-muted-foreground">{c.tipo}</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle text-right font-medium">${c.proyectado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-4 align-middle text-right font-bold">${c.real.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className={cn(
                            "p-4 align-middle text-right font-bold",
                            c.diferencia >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {c.diferencia > 0 ? '+' : ''}${c.diferencia.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-full bg-slate-200 rounded-full h-1.5 max-w-[80px]">
                                <div 
                                  className={cn(
                                    "h-1.5 rounded-full",
                                    c.porcentaje > 100 ? "bg-amber-500" : "bg-primary"
                                  )} 
                                  style={{ width: `${Math.min(c.porcentaje, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold">{c.porcentaje.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                        {c.subDetails.map(sub => (
                          <tr key={sub.id} className="border-b transition-colors hover:bg-muted/50 text-sm">
                            <td className="p-3 pl-8 align-middle text-muted-foreground">
                              {sub.nombre}
                            </td>
                            <td className="p-3 align-middle text-right text-muted-foreground">
                              ${sub.proyectado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 align-middle text-right">
                              ${sub.real.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className={cn(
                              "p-3 align-middle text-right font-medium",
                              sub.diferencia >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {sub.diferencia > 0 ? '+' : ''}${sub.diferencia.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 align-middle">
                              <div className="flex flex-col items-center gap-1 opacity-80">
                                <span className={cn("text-[10px] font-bold", sub.porcentaje > 100 ? "text-amber-600" : "")}>{sub.porcentaje.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const ResumenCard = ({ title, value, sub, color, icon: Icon, showPlus = false }) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={cn("text-3xl font-black", color)}>
        {showPlus && value > 0 ? '+' : ''}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {sub}
      </p>
    </CardContent>
  </Card>
);

export default Comparativo;
