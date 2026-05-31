import { lazy, Suspense, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';

const DashboardCharts = lazy(() => import('../components/dashboard/DashboardCharts'));

const Dashboard = () => {
  const { movimientos, proyecciones, loading, categorias, subcategorias } = useData();
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));

  const dataMes = useMemo(() => {
    const movs = movimientos.filter(m => m.fecha.startsWith(mes));
    const proys = proyecciones.filter(p => p.mes === mes);

    const ingresosReales = movs
      .filter(m => m.tipo === 'ingreso' && m.estado !== 'proyectado' && m.contabiliza !== false)
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const egresosReales = movs
      .filter(m => m.tipo === 'egreso' && m.estado !== 'proyectado' && m.contabiliza !== false)
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const ingresosProyectados = proys
      .filter(p => p.tipo === 'ingreso')
      .reduce((acc, p) => acc + (Number(p.montoProyectado) || 0), 0);

    const egresosProyFisicos = proys
      .filter(p => p.tipo === 'egreso')
      .reduce((acc, p) => acc + (Number(p.montoProyectado) || 0), 0);

    const cuotasMes = movimientos
      .filter(m =>
        m.esCuota === true &&
        m.fecha.startsWith(mes) &&
        m.tipo === 'egreso' &&
        m.contabiliza !== false
      )
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const recurrentesMes = movimientos
      .filter(m =>
        m.recurrente === true &&
        m.fecha.substring(0, 7) <= mes &&
        m.tipo === 'egreso' &&
        m.contabiliza !== false
      )
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const egresosProyectados = egresosProyFisicos + cuotasMes + recurrentesMes;
    const ahorroReal = ingresosReales - egresosReales;
    const ahorroProyectado = ingresosProyectados - egresosProyectados;
    const diferenciaAhorro = ahorroReal - ahorroProyectado;

    const barData = [
      { name: 'Ingresos', Real: ingresosReales, Proyectado: ingresosProyectados },
      { name: 'Gastos', Real: egresosReales, Proyectado: egresosProyectados },
    ];

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#14b8a6', '#84cc16', '#06b6d4'];

    const gastosSubcat = subcategorias
      .map(sub => {
        const cat = categorias.find(c => c.id === sub.categoriaId);
        if (cat?.tipo !== 'egreso') return null;
        return {
          name: `${cat.icono || ''} ${sub.nombre}`,
          value: movs
            .filter(m => m.subcategoriaId === sub.id && m.estado !== 'proyectado' && m.contabiliza !== false)
            .reduce((acc, m) => acc + (Number(m.monto) || 0), 0)
        };
      })
      .filter(d => d && d.value > 0);

    const gastosSinSub = categorias
      .filter(c => c.tipo === 'egreso')
      .map(cat => ({
        name: `${cat.icono || ''} ${cat.nombre} (Otros)`,
        value: movs
          .filter(m => (m.categoriaId === cat.id || m.categoria === cat.nombre) && !m.subcategoriaId && m.estado !== 'proyectado' && m.contabiliza !== false)
          .reduce((acc, m) => acc + (Number(m.monto) || 0), 0)
      }))
      .filter(d => d.value > 0);

    const gastosPorCat = [...gastosSubcat, ...gastosSinSub]
      .sort((a, b) => b.value - a.value)
      .map((item, i) => ({ ...item, color: colors[i % colors.length] }));

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
        <CardContent className="h-[300px] pt-4">
          <div className="flex h-full items-center justify-center rounded-md bg-secondary/40 text-xs font-bold uppercase text-muted-foreground">
            Cargando gráfico...
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default Dashboard;
