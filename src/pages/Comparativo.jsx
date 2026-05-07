import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const Comparativo = () => {
  const { categorias, movimientos, loadProyecciones } = useData();
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const [proyecciones, setProyecciones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await loadProyecciones(mes);
      setProyecciones(data);
      setLoading(false);
    };
    fetchData();
  }, [mes, movimientos]); // Recargar si cambia el mes o los movimientos

  // Consolidar datos comparativos siguiendo el nuevo modelo
  const comparativa = categorias.map(cat => {
    // Buscar el monto en la entidad separada de proyecciones
    const proyectado = proyecciones.find(p => p.categoriaId === cat.id)?.montoProyectado || 0;
    
    // Sumar movimientos reales del mes
    const real = movimientos
      .filter(m => (m.categoriaId === cat.id || m.categoria === cat.nombre) && m.fecha.startsWith(mes) && m.estado !== 'proyectado')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    
    // Diferencia: 
    // En INGRESOS: real - proyectado (positivo es bueno)
    // En EGRESOS: proyectado - real (positivo es bueno, gastaste menos de lo previsto)
    const diferencia = cat.tipo === 'ingreso' ? real - proyectado : proyectado - real;
    const porcentaje = proyectado > 0 ? (real / proyectado) * 100 : 0;
    
    return {
      ...cat,
      proyectado,
      real,
      diferencia,
      porcentaje
    };
  }).filter(c => c.proyectado > 0 || c.real > 0);

  const totalIngresosProyectado = comparativa.filter(c => c.tipo === 'ingreso').reduce((acc, c) => acc + c.proyectado, 0);
  const totalIngresosReal = comparativa.filter(c => c.tipo === 'ingreso').reduce((acc, c) => acc + c.real, 0);
  const totalGastosProyectado = comparativa.filter(c => c.tipo === 'egreso').reduce((acc, c) => acc + c.proyectado, 0);
  const totalGastosReal = comparativa.filter(c => c.tipo === 'egreso').reduce((acc, c) => acc + c.real, 0);

  const ahorroReal = totalIngresosReal - totalGastosReal;
  const ahorroProyectado = totalIngresosProyectado - totalGastosProyectado;
  const diferenciaAhorro = ahorroReal - ahorroProyectado;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Comparativo</h2>
          <p className="text-muted-foreground">Análisis de desvío entre lo previsto y lo real.</p>
        </div>
        <input 
          type="month" 
          className="p-2 border rounded-md bg-background text-sm font-medium"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Calculando comparativa...
        </div>
      ) : (
        <>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalle por Categoría</CardTitle>
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
                    {comparativa.map((c) => (
                      <tr key={c.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-semibold">{c.icono} {c.nombre}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">{c.tipo}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right text-muted-foreground">${c.proyectado.toLocaleString()}</td>
                        <td className="p-4 align-middle text-right font-medium">${c.real.toLocaleString()}</td>
                        <td className={cn(
                          "p-4 align-middle text-right font-bold",
                          c.diferencia >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {c.diferencia > 0 ? '+' : ''}${c.diferencia.toLocaleString()}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                              <div 
                                className={cn(
                                  "h-1.5 rounded-full",
                                  c.porcentaje > 100 ? "bg-amber-500" : "bg-primary"
                                )} 
                                style={{ width: `${Math.min(c.porcentaje, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold">{c.porcentaje.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
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
        {showPlus && value > 0 ? '+' : ''}${Number(value).toLocaleString()}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {sub}
      </p>
    </CardContent>
  </Card>
);

export default Comparativo;
