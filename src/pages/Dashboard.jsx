import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

const Dashboard = () => {
  const { movimientos, proyecciones, loading, categorias } = useData();
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));

  // Datos filtrados por mes
  const dataMes = useMemo(() => {
    const movs = movimientos.filter(m => m.fecha.startsWith(mes));
    const proys = proyecciones.filter(p => p.mes === mes);

    const ingresosReales = movs
      .filter(m => m.tipo === 'ingreso' && m.estado !== 'proyectado')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
      
    const egresosReales = movs
      .filter(m => m.tipo === 'egreso' && m.estado !== 'proyectado')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    
    const ingresosProyectados = proys.filter(p => p.tipo === 'ingreso').reduce((acc, p) => acc + p.montoProyectado, 0);
    const egresosProyectados = proys.filter(p => p.tipo === 'egreso').reduce((acc, p) => acc + p.montoProyectado, 0);

    const ahorroReal = ingresosReales - egresosReales;
    const ahorroProyectado = ingresosProyectados - egresosProyectados;
    const diferenciaAhorro = ahorroReal - ahorroProyectado;

    // Datos para gráfico de barras (Ingresos vs Egresos)
    const barData = [
      { name: 'Ingresos', Real: ingresosReales, Proyectado: ingresosProyectados },
      { name: 'Gastos', Real: egresosReales, Proyectado: egresosProyectados },
    ];

    // Datos para gráfico de torta (Gastos por Categoría)
    const gastosPorCat = categorias
      .filter(c => c.tipo === 'egreso')
      .map(cat => ({
        name: cat.nombre,
        value: movs
          .filter(m => (m.categoriaId === cat.id || m.categoria === cat.nombre) && m.estado !== 'proyectado')
          .reduce((acc, m) => acc + (Number(m.monto) || 0), 0),
        color: cat.color || '#cbd5e1'
      }))
      .filter(d => d.value > 0);

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
  }, [movimientos, proyecciones, mes, categorias]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin mr-2" /> Cargando datos...</div>;

  const stats = [
    { title: 'Ingresos Reales', value: dataMes.ingresosReales, sub: `Proyectado: $${dataMes.ingresosProyectados.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Gastos Reales', value: dataMes.egresosReales, sub: `Proyectado: $${dataMes.egresosProyectados.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-50' },
    { title: 'Ahorro Real', value: dataMes.ahorroReal, sub: `Meta: $${dataMes.ahorroProyectado.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Wallet, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { title: 'Diferencia de Ahorro', value: dataMes.diferenciaAhorro, sub: 'Real vs Meta', icon: ArrowRightLeft, color: dataMes.diferenciaAhorro >= 0 ? 'text-blue-500' : 'text-amber-500', bg: 'bg-blue-50', showPlus: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm font-medium">Resumen financiero mensual en tiempo real.</p>
        </div>
        <input 
          type="month" 
          className="p-2 border rounded-md bg-background text-sm font-bold shadow-sm"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className={cn("h-1 w-full", stat.color.replace('text', 'bg'))} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase">{stat.title}</CardTitle>
              <div className={cn("p-2 rounded-full", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Real vs Proyectado</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMes.barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  formatter={(value) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Legend />
                <Bar dataKey="Proyectado" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="Real" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {dataMes.gastosPorCat.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataMes.gastosPorCat}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataMes.gastosPorCat.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <TrendingDown className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-xs font-bold uppercase italic">Sin gastos registrados en {mes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
