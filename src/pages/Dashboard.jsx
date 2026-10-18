import { lazy, Suspense, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useData } from '../context/DataContext';
const DashboardCharts = lazy(() => import('../components/dashboard/DashboardCharts'));

const Dashboard = () => {
  const { movimientos, proyecciones, loading, categorias, subcategorias } = useData();
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));

  const dataMes = useMemo(() => {
    const movs = movimientos.filter(m => m.fecha.startsWith(mes));

    // Proyecciones del mes seleccionado
    const proysDelMes = proyecciones.filter(p => p.mes === mes);

    const isTipo = (p, tipo) => {
      if (p.tipo) return p.tipo === tipo;
      const cat = categorias.find(c => c.id === p.categoriaId);
      return cat?.tipo === tipo;
    };

    const getMonto = (p) => Number(p.montoProyectado !== undefined && p.montoProyectado !== null ? p.montoProyectado : (p.monto || 0));

    const ingresosReales = movs
      .filter(m => m.tipo === 'ingreso' && m.estado !== 'proyectado' && m.contabiliza !== false)
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const egresosReales = movs
      .filter(m => m.tipo === 'egreso' && m.estado !== 'proyectado' && m.contabiliza !== false)
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const ingresosProyectados = proysDelMes
      .filter(p => isTipo(p, 'ingreso'))
      .reduce((acc, p) => acc + getMonto(p), 0);

    const egresosProyectados = proysDelMes
      .filter(p => isTipo(p, 'egreso'))
      .reduce((acc, p) => acc + getMonto(p), 0);

    const ahorroReal = ingresosReales - egresosReales;
    const ahorroProyectado = ingresosProyectados - egresosProyectados;
    const diferenciaAhorro = ahorroReal - ahorroProyectado;

    const barData = [
      { name: 'Ingresos', Real: ingresosReales, Proyectado: ingresosProyectados },
      { name: 'Gastos', Real: egresosReales, Proyectado: egresosProyectados },
    ];

    // Paleta de alta distinción cromática (cada una con un tono bien contrastante)
    const PALETA_DISTINTIVA = [
      '#10b981', // Esmeralda / Verde (Alimentación)
      '#6366f1', // Indigo vibrante (Vehículo/Transporte)
      '#f59e0b', // Ámbar / Dorado
      '#ec4899', // Rosa fuerte (Entretenimiento)
      '#0ea5e9', // Celeste / Azul (Servicios)
      '#8b5cf6', // Violeta intenso (Hogar/Familia)
      '#f43f5e', // Rojo coral (Salud)
      '#14b8a6', // Turquesa
      '#f97316', // Naranja fuego
      '#84cc16', // Lima
      '#3b82f6', // Azul eléctrico
      '#d946ef', // Magenta
      '#06b6d4', // Cian brillante
      '#a855f7', // Púrpura
    ];

    const COLOR_POR_TEMA = {
      alimentacion: '#10b981',   // Verde
      vehiculo: '#6366f1',       // Indigo
      transporte: '#6366f1',
      servicio: '#0ea5e9',       // Celeste
      salud: '#f43f5e',          // Rojo coral
      hogar: '#8b5cf6',          // Violeta
      familia: '#8b5cf6',
      entretenimiento: '#ec4899',// Rosa fucsia
      educacion: '#f59e0b',      // Ámbar
      profesional: '#14b8a6',    // Turquesa
      impuesto: '#f97316',       // Naranja
    };

    // Agrupación exclusiva por Categoría Principal (sin abrir por subcategorías)
    const categoriasConGasto = categorias
      .filter(c => c.tipo === 'egreso')
      .map(cat => {
        const movsCat = movs.filter(m => 
          (m.categoriaId === cat.id || m.categoria === cat.nombre) && 
          m.tipo === 'egreso' && 
          m.estado !== 'proyectado' && 
          m.contabiliza !== false
        );
        const total = movsCat.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
        if (total <= 0) return null;

        // Desglose de subcategorías
        const subsDeCat = subcategorias.filter(s => s.categoriaId === cat.id);
        const subDesglose = subsDeCat
          .map(sub => {
            const movsSub = movsCat.filter(m => m.subcategoriaId === sub.id);
            const val = movsSub.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
            return {
              id: sub.id,
              nombre: sub.nombre,
              valor: val,
              cantidad: movsSub.length,
              porcentaje: total > 0 ? (val / total) * 100 : 0
            };
          })
          .filter(s => s.valor > 0)
          .sort((a, b) => b.valor - a.valor);

        // Sin subcategoría o subcategoría eliminada dentro de esta categoría
        const movsSinSub = movsCat.filter(m => !m.subcategoriaId || !subsDeCat.some(s => s.id === m.subcategoriaId));
        const valSinSub = movsSinSub.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
        if (valSinSub > 0) {
          subDesglose.push({
            id: `sin_sub_${cat.id}`,
            nombre: 'Otros / Sin subcategoría',
            valor: valSinSub,
            cantidad: movsSinSub.length,
            porcentaje: total > 0 ? (valSinSub / total) * 100 : 0
          });
        }

        const movsOrdenados = [...movsCat].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

        return {
          id: cat.id,
          nombre: `${cat.icono || ''} ${cat.nombre}`.trim(),
          rawNombre: cat.nombre || '',
          icono: cat.icono || '🏷️',
          value: total,
          cantidad: movsCat.length,
          subcategorias: subDesglose,
          movimientos: movsOrdenados
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value);

    // Asignar colores 100% distintos y no repetidos
    const usedColors = new Set();
    const gastosPorCat = categoriasConGasto.map((item, idx) => {
      let chosenColor = null;
      const lower = item.rawNombre.toLowerCase();
      for (const [key, color] of Object.entries(COLOR_POR_TEMA)) {
        if (lower.includes(key) && !usedColors.has(color)) {
          chosenColor = color;
          break;
        }
      }
      if (!chosenColor) {
        chosenColor = PALETA_DISTINTIVA.find(c => !usedColors.has(c)) || PALETA_DISTINTIVA[idx % PALETA_DISTINTIVA.length];
      }
      usedColors.add(chosenColor);

      return {
        ...item,
        name: item.nombre,
        value: item.value,
        color: chosenColor
      };
    });

    // Gastos sin categoría asignada
    const movsSinCat = movs.filter(m => 
      !m.categoriaId && 
      !m.categoria && 
      m.tipo === 'egreso' && 
      m.estado !== 'proyectado' && 
      m.contabiliza !== false
    );
    const gastosSinCat = movsSinCat.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    if (gastosSinCat > 0) {
      gastosPorCat.push({
        id: '__sin_cat__',
        name: '❓ Sin Categoría',
        rawNombre: 'Sin Categoría',
        icono: '❓',
        value: gastosSinCat,
        color: '#94a3b8',
        cantidad: movsSinCat.length,
        subcategorias: [],
        movimientos: [...movsSinCat].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
      });
      gastosPorCat.sort((a, b) => b.value - a.value);
    }

    return {
      ingresosReales,
      egresosReales,
      ahorroReal,
      ingresosProyectados,
      egresosProyectados,
      ahorroProyectado,
      diferenciaAhorro,
      barData,
      gastosPorCat
    };
  }, [movimientos, proyecciones, mes, categorias, subcategorias]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin mr-2" />
        Cargando datos...
      </div>
    );
  }

  const stats = [
    { title: 'Ingresos Reales', value: dataMes.ingresosReales, sub: `Proyectado: $${dataMes.ingresosProyectados.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Gastos Reales', value: dataMes.egresosReales, sub: `Proyectado: $${dataMes.egresosProyectados.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-50' },
    { title: 'Ahorro Real', value: dataMes.ahorroReal, sub: `Meta: $${dataMes.ahorroProyectado.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Diferencia de Ahorro', value: dataMes.diferenciaAhorro, sub: 'Real vs Meta', icon: ArrowRightLeft, color: dataMes.diferenciaAhorro >= 0 ? 'text-blue-500' : 'text-amber-500', bg: 'bg-blue-50', showPlus: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm font-medium">Resumen financiero mensual en tiempo real.</p>
        </div>
        <input
          type="month"
          className="p-2 border rounded-md bg-background text-sm font-bold shadow-sm w-fit"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className={cn('h-1 w-full', stat.color.replace('text', 'bg'))} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{stat.title}</CardTitle>
              <div className={cn('p-2 rounded-full', stat.bg)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">
                {stat.showPlus && stat.value > 0 ? '+' : ''}${stat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Suspense fallback={<ChartsFallback />}>
        <DashboardCharts dataMes={dataMes} mes={mes} />
      </Suspense>
    </div>
  );
};

const ChartsFallback = () => (
  <div className="grid gap-6 md:grid-cols-2">
    {['Real vs Proyectado', 'Gastos por Categoría'].map((title) => (
      <Card key={title} className="shadow-md border-none">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px] pt-4">
          <div className="flex h-full items-center justify-center rounded-md bg-secondary/40 text-xs font-bold uppercase text-muted-foreground">
            Cargando gráfico...
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default Dashboard;
