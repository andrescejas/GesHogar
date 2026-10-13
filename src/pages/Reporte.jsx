import { useState, useMemo, useRef, useEffect } from 'react';
import { FileText, Search, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';
import { getOrigenCuenta } from '../lib/cuentaHelper';

const fmt = (n) => `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Reporte = () => {
  const { movimientos, categorias, subcategorias, tarjetas } = useData();

  const [mes, setMes]                               = useState(new Date().toISOString().substring(0, 7));
  const [filtroResponsable, setFiltroResponsable]   = useState('');
  const [filtroCuentas, setFiltroCuentas]           = useState([]);
  const [orden, setOrden]                           = useState('monto_desc'); // 'monto_desc', 'monto_asc', 'fecha_desc', 'fecha_asc'
  const [filtroTipo, setFiltroTipo]                 = useState(''); // '' (todos), 'egreso', 'ingreso'
  const [filtroCategoria, setFiltroCategoria]       = useState('');
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('');

  const cuentasDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cuentasDropdownRef.current && !cuentasDropdownRef.current.contains(event.target)) {
        cuentasDropdownRef.current.removeAttribute('open');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Responsables disponibles
  const responsablesDisponibles = useMemo(() => {
    const set = new Set(['Familia', 'Andres', 'Cecilia', 'Agustin']);
    movimientos.forEach(m => {
      if (m.responsable) set.add(m.responsable);
    });
    return Array.from(set);
  }, [movimientos]);

  // Cuentas / tarjetas con movimientos disponibles
  const cuentasConMovimientos = useMemo(() => {
    const movsBase = movimientos.filter(m => {
      if (mes && !m.fecha.startsWith(mes)) return false;
      if (filtroResponsable && m.responsable !== filtroResponsable) return false;
      if (m.contabiliza === false) return false;
      return true;
    });

    const mapa = {};
    movsBase.forEach(m => {
      const oc = getOrigenCuenta(m, tarjetas);
      if (!mapa[oc.id]) {
        mapa[oc.id] = { id: oc.id, label: oc.label, icono: oc.icono, count: 0 };
      }
      mapa[oc.id].count++;
    });
    return Object.values(mapa).sort((a, b) => b.count - a.count);
  }, [movimientos, tarjetas, mes, filtroResponsable]);

  const toggleFilterCuenta = (cuentaId) => {
    setFiltroCuentas(prev =>
      prev.includes(cuentaId)
        ? prev.filter(id => id !== cuentaId)
        : [...prev, cuentaId]
    );
  };

  const totalMovsPeriodo = useMemo(() => {
    return cuentasConMovimientos.reduce((acc, c) => acc + c.count, 0);
  }, [cuentasConMovimientos]);

  const filtroCuentasLabel = useMemo(() => {
    if (filtroCuentas.length === 0) return 'Todas las cuentas / tarjetas';
    if (filtroCuentas.length === 1) {
      const encontrada = cuentasConMovimientos.find(c => c.id === filtroCuentas[0]);
      return encontrada ? `${encontrada.icono} ${encontrada.label}` : '1 seleccionada';
    }
    return `${filtroCuentas.length} seleccionadas`;
  }, [filtroCuentas, cuentasConMovimientos]);

  // Categorías disponibles según el Tipo
  const catsDisponibles = useMemo(() => {
    if (!filtroTipo) return categorias;
    return categorias.filter(c => c.tipo === filtroTipo);
  }, [categorias, filtroTipo]);

  const handleTipoChange = (nuevoTipo) => {
    setFiltroTipo(nuevoTipo);
    if (nuevoTipo && filtroCategoria) {
      const cat = categorias.find(c => c.id === filtroCategoria);
      if (cat && cat.tipo !== nuevoTipo) {
        setFiltroCategoria('');
        setFiltroSubcategoria('');
      }
    }
  };

  // Subcategorías disponibles según la categoría seleccionada
  const subcatsFiltro = useMemo(() => {
    if (!filtroCategoria) return subcategorias;
    return subcategorias.filter(s => s.categoriaId === filtroCategoria);
  }, [subcategorias, filtroCategoria]);

  // Movimientos filtrados
  const movsFiltrados = useMemo(() => {
    return movimientos.filter(m => {
      if (mes && !m.fecha.startsWith(mes)) return false;
      if (filtroTipo && m.tipo !== filtroTipo) return false;
      if (filtroResponsable && m.responsable !== filtroResponsable) return false;
      if (filtroCuentas.length > 0) {
        const oc = getOrigenCuenta(m, tarjetas);
        if (!filtroCuentas.includes(oc.id)) return false;
      }
      if (filtroCategoria && m.categoriaId !== filtroCategoria) return false;
      if (filtroSubcategoria && m.subcategoriaId !== filtroSubcategoria) return false;
      // Excluir compras informativas y proyecciones
      if (m.contabiliza === false) return false;
      if (m.estado === 'proyectado') return false;
      return true;
    });
  }, [movimientos, mes, filtroTipo, filtroResponsable, filtroCuentas, filtroCategoria, filtroSubcategoria, tarjetas]);

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

  // Categorías ordenadas según el criterio seleccionado
  const catIdsOrdenados = useMemo(() => {
    return Object.keys(grupos).sort((catIdA, catIdB) => {
      const totalA = Object.values(grupos[catIdA]).reduce((a, s) => a + s.ingresos + s.egresos, 0);
      const totalB = Object.values(grupos[catIdB]).reduce((a, s) => a + s.ingresos + s.egresos, 0);
      if (orden === 'monto_asc') return totalA - totalB;
      return totalB - totalA;
    });
  }, [grupos, orden]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
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
              <label className="text-xs font-bold uppercase text-muted-foreground">Responsable</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={filtroResponsable}
                onChange={e => { setFiltroResponsable(e.target.value); setFiltroCuentas([]); }}
              >
                <option value="">Todos los miembros</option>
                {responsablesDisponibles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Cuenta / Tarjeta</label>
              <details ref={cuentasDropdownRef} className="relative">
                <summary className="list-none [&::-webkit-details-marker]:hidden w-full p-2 border rounded-md bg-background text-sm font-medium cursor-pointer flex items-center justify-between gap-2 outline-none focus:ring-2 focus:ring-primary/20">
                  <span className="truncate">{filtroCuentasLabel}</span>
                  <span className="text-xs text-muted-foreground shrink-0">▾</span>
                </summary>
                <div className="absolute left-0 z-30 mt-2 w-72 rounded-md border bg-background shadow-lg p-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Cuentas con movimientos</span>
                    {filtroCuentas.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-indigo-600 font-semibold hover:underline"
                        onClick={() => setFiltroCuentas([])}
                      >
                        Limpiar ({filtroCuentas.length})
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 rounded text-sm font-medium hover:bg-accent flex items-center justify-between"
                    onClick={() => setFiltroCuentas([])}
                  >
                    <span>Todas las cuentas / tarjetas</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({totalMovsPeriodo})
                    </span>
                  </button>
                  <div className="my-1 border-t" />
                  <div className="max-h-64 overflow-auto space-y-1">
                    {cuentasConMovimientos.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">No hay movimientos en este período</p>
                    ) : (
                      cuentasConMovimientos.map(cuenta => (
                        <label key={cuenta.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-accent">
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300"
                              checked={filtroCuentas.includes(cuenta.id)}
                              onChange={() => toggleFilterCuenta(cuenta.id)}
                            />
                            <span className="truncate">{cuenta.icono} {cuenta.label}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground shrink-0 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                            {cuenta.count}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </details>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Tipo</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={filtroTipo}
                onChange={e => handleTipoChange(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="egreso">Egresos (Gastos)</option>
                <option value="ingreso">Ingresos</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Categoría</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={filtroCategoria}
                onChange={e => { setFiltroCategoria(e.target.value); setFiltroSubcategoria(''); }}
              >
                <option value="">
                  {filtroTipo === 'egreso' ? 'Todas las de gasto' : (filtroTipo === 'ingreso' ? 'Todas las de ingreso' : 'Todas las categorías')}
                </option>
                {filtroTipo ? (
                  catsDisponibles.map(c => (
                    <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                  ))
                ) : (
                  <>
                    <optgroup label="Egresos (Gastos)">
                      {categorias.filter(c => c.tipo !== 'ingreso').map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Ingresos">
                      {categorias.filter(c => c.tipo === 'ingreso').map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                      ))}
                    </optgroup>
                  </>
                )}
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
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Ordenar por</label>
              <select
                className="w-full p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={orden}
                onChange={e => setOrden(e.target.value)}
              >
                <option value="monto_desc">Mayor a menor importe (▼ $)</option>
                <option value="monto_asc">Menor a mayor importe (▲ $)</option>
                <option value="fecha_desc">Fecha más reciente primero</option>
                <option value="fecha_asc">Fecha más antigua primero</option>
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
      {catIdsOrdenados.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground">
            <Search className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm italic">Sin movimientos para los filtros seleccionados.</p>
          </CardContent>
        </Card>
      ) : (
        catIdsOrdenados.map(catId => {
          const cat = categorias.find(c => c.id === catId);
          const catIngresos = Object.values(grupos[catId]).reduce((a, s) => a + s.ingresos, 0);
          const catEgresos  = Object.values(grupos[catId]).reduce((a, s) => a + s.egresos, 0);

          // Subcategorías ordenadas
          const subIdsOrdenados = Object.keys(grupos[catId]).sort((subA, subB) => {
            const totalA = grupos[catId][subA].ingresos + grupos[catId][subA].egresos;
            const totalB = grupos[catId][subB].ingresos + grupos[catId][subB].egresos;
            if (orden === 'monto_asc') return totalA - totalB;
            return totalB - totalA;
          });

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
                {subIdsOrdenados.map(subId => {
                  const sub = subcategorias.find(s => s.id === subId);
                  const { ingresos, egresos, movs } = grupos[catId][subId];

                  // Movimientos ordenados
                  const movsOrdenados = [...movs].sort((a, b) => {
                    const mA = Number(a.monto) || 0;
                    const mB = Number(b.monto) || 0;
                    if (orden === 'monto_desc') return mB - mA;
                    if (orden === 'monto_asc') return mA - mB;
                    if (orden === 'fecha_asc') return a.fecha.localeCompare(b.fecha);
                    return b.fecha.localeCompare(a.fecha);
                  });

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
                            {movsOrdenados.map(m => {
                              const oc = getOrigenCuenta(m, tarjetas);
                              return (
                                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-2 text-muted-foreground whitespace-nowrap w-[90px]">{m.fecha}</td>
                                  <td className="px-2 py-2 text-slate-700 truncate max-w-[170px]">{m.descripcion || '-'}</td>
                                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded">
                                      <span>{oc.icono}</span>
                                      <span className="truncate max-w-[130px]">{oc.label}</span>
                                    </span>
                                  </td>
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
                              );
                            })}
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
