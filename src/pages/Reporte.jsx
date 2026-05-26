import React, { useState, useMemo } from 'react';
import { FileText, Search, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';

const fmt = (n) => `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Reporte = () => {
  const { movimientos, categorias, subcategorias } = useData();

  const [mes, setMes]               = useState(new Date().toISOString().substring(0, 7));
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('');

  // Subcategorías disponibles según la categoría seleccionada
  const subcatsFiltro = useMemo(() => {
    if (!filtroCategoria) return subcategorias;
    return subcategorias.filter(s => s.categoriaId === filtroCategoria);
  }, [subcategorias, filtroCategoria]);

  // Movimientos filtrados
  const movsFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      if (mes && !m.fecha.startsWith(mes))              return false;
      if (filtroCategoria && m.categoriaId !== filtroCategoria) return false;
      if (filtroSubcategoria && m.subcategoriaId !== filtroSubcategoria) return false;
      // Excluir compras informativas
      if (m.contabiliza === false) return false;
      return true;
    });
  }, [movimientos, mes, filtroCategoria, filtroSubcategoria]);

  // Agrupar por categoría → subcategoría
  const grupos = useMemo(() => {
    const map = {};
    movsFiltrados.forEach(m => {
      const catId = m.categoriaId || '__sin_cat__';
      if (!map[catId]) map[catId] = {};
      const subId = m.subcategoriaId || '__sin_sub__';
      if (!map[catId][subId]) map[catId][subId] = { ingresos: 0, egresos: 0, movs: [] };
      if (m.tipo === 'ingreso') map[catId][subId].ingresos += Number(m.monto) || 0;
      else map[catId][subId].egresos += Number(m.monto) || 0;
      map[catId][subId].movs.push(m);
    });
    return map;
  }, [movsFiltrados]);

  const totalIngresos = movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((a, m) => a + (Number(m.monto) || 0), 0);
  const totalEgresos  = movsFiltrados.filter(m => m.tipo === 'egreso').reduce((a, m) => a + (Number(m.monto) || 0), 0);
  const saldo = totalIngresos - totalEgresos;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Reporte
          </h2>
          <p className="text-muted-foreground text-sm">Detalle de movimientos por categoría y subcategoría.</p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Mes</label>
              <input
                type="month"
                className="w-full p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={mes}
                onChange={e => setMes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Categoría</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={filtroCategoria}
                onChange={e => { setFiltroCategoria(e.target.value); setFiltroSubcategoria(''); }}
              >
                <option value="">Todas las categorías</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Subcategoría</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={filtroSubcategoria}
                onChange={e => setFiltroSubcategoria(e.target.value)}
                disabled={!filtroCategoria}
              >
                <option value="">Todas las subcategorías</option>
                {subcatsFiltro.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totalizadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-emerald-50/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase">Total Ingresos</p>
              <p className="text-2xl font-black text-emerald-600">{fmt(totalIngresos)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-rose-50/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-rose-100">
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-rose-700 uppercase">Total Egresos</p>
              <p className="text-2xl font-black text-rose-600">{fmt(totalEgresos)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-slate-50/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-slate-100">
              <Wallet className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-700 uppercase">Saldo</p>
              <p className={cn("text-2xl font-black", saldo >= 0 ? "text-slate-800" : "text-rose-600")}>{fmt(saldo)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla por categoría → subcategoría */}
      {Object.keys(grupos).length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground">
            <Search className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm italic">Sin movimientos para los filtros seleccionados.</p>
          </CardContent>
        </Card>
      ) : (
        Object.keys(grupos).map(catId => {
          const cat = categorias.find(c => c.id === catId);
          const catIngresos = Object.values(grupos[catId]).reduce((a, s) => a + s.ingresos, 0);
          const catEgresos  = Object.values(grupos[catId]).reduce((a, s) => a + s.egresos, 0);

          return (
            <Card key={catId} className="border-none shadow-sm overflow-hidden">
              {/* Encabezado categoría */}
              <CardHeader className={cn(
                "border-b py-3 px-5",
                cat?.tipo === 'ingreso' ? "bg-emerald-50/60" : "bg-rose-50/40"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span className="text-xl">{cat?.icono || '📁'}</span>
                    {cat?.nombre || 'Sin Categoría'}
                    <span className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                      cat?.tipo === 'ingreso'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    )}>
                      {cat?.tipo || 'egreso'}
                    </span>
                  </CardTitle>
                  <div className="flex gap-4 text-sm font-bold">
                    {catIngresos > 0 && <span className="text-emerald-600">▲ {fmt(catIngresos)}</span>}
                    {catEgresos  > 0 && <span className="text-rose-600">▼ {fmt(catEgresos)}</span>}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {Object.keys(grupos[catId]).map(subId => {
                  const sub = subcategorias.find(s => s.id === subId);
                  const { ingresos, egresos, movs } = grupos[catId][subId];

                  return (
                    <div key={subId} className="border-b last:border-0">
                      {/* Fila subcategoría */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 bg-slate-50/50 gap-1">
                        <span className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {sub?.nombre || 'Sin Subcategoría'}
                          <span className="text-xs text-muted-foreground font-normal">({movs.length} mov.)</span>
                        </span>
                        <div className="flex gap-4 text-sm font-bold pl-5 sm:pl-0">
                          {ingresos > 0 && <span className="text-emerald-600">▲ {fmt(ingresos)}</span>}
                          {egresos  > 0 && <span className="text-rose-600">▼ {fmt(egresos)}</span>}
                        </div>
                      </div>

                      {/* Detalle movimientos */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <tbody>
                            {movs.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(m => (
                              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-2 text-muted-foreground whitespace-nowrap w-[90px]">{m.fecha}</td>
                                <td className="px-2 py-2 text-slate-700 truncate max-w-[160px]">{m.descripcion || '-'}</td>
                                <td className="px-2 py-2 text-muted-foreground">{m.responsable || '-'}</td>
                                <td className="px-2 py-2 text-right">
                                  <span className={cn(
                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                                    m.estado === 'pagado' ? "bg-blue-100 text-blue-700" :
                                    m.estado === 'pendiente' ? "bg-amber-100 text-amber-700" :
                                    "bg-slate-100 text-slate-600"
                                  )}>
                                    {m.estado}
                                  </span>
                                </td>
                                <td className={cn(
                                  "px-4 py-2 text-right font-bold whitespace-nowrap",
                                  m.tipo === 'ingreso' ? "text-emerald-600" : "text-rose-600"
                                )}>
                                  {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default Reporte;
