import { Fragment, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Copy, Plus, Trash2, Edit, Search, ListFilter, Calendar, ChevronLeft, ChevronRight, CalendarDays, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { CalendarioVencimientos } from '../components/proyecciones/CalendarioVencimientos';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

const getMesAnterior = (isoMes) => {
  if (!isoMes) return '';
  const [y, m] = isoMes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
};

const getMesSiguiente = (isoMes) => {
  if (!isoMes) return '';
  const [y, m] = isoMes.split('-').map(Number);
  const d = new Date(y, m, 1);
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

const Proyecciones = () => {
  const { categorias, subcategorias, proyecciones, movimientos, saveProyeccion, updateProyeccion, updateMovimiento, deleteProyeccion } = useData();
  const [modoVista, setModoVista] = useState('proyecciones'); // 'proyecciones' | 'vencimientos'
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNaturaleza, setFilterNaturaleza] = useState('todos'); // 'todos', 'fijo', 'variable'
  const mesActualHoy = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const esMesActual = mes === mesActualHoy;
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    categoriaId: '',
    subcategoriaId: '',
    descripcion: '',
    responsable: '',
    monto: '',
    diaVencimiento: '',
    tipoGasto: 'fijo', // 'fijo' | 'variable'
    frecuencia: 'Única',
    fechaInicio: new Date().toISOString().substring(0, 10),
    fechaFin: '',
    generarMovimientos: false
  });

  const proyeccionesList = useMemo(() => {
    return proyecciones.filter(p => p.mes === mes);
  }, [proyecciones, mes]);

  const handleOpenModal = (proyeccion = null) => {
    if (proyeccion) {
      setFormData({
        id: proyeccion.id,
        categoriaId: proyeccion.categoriaId,
        subcategoriaId: proyeccion.subcategoriaId || '',
        descripcion: proyeccion.descripcion || '',
        responsable: proyeccion.responsable || '',
        monto: (proyeccion.montoProyectado !== undefined && proyeccion.montoProyectado !== null ? proyeccion.montoProyectado : (proyeccion.monto || '')).toString(),
        diaVencimiento: proyeccion.diaVencimiento !== undefined && proyeccion.diaVencimiento !== null ? String(proyeccion.diaVencimiento) : '',
        tipoGasto: proyeccion.tipoGasto || 'fijo',
        frecuencia: proyeccion.frecuencia || 'Única',
        fechaInicio: proyeccion.fechaInicio || new Date().toISOString().substring(0, 10),
        fechaFin: proyeccion.fechaFin || '',
        generarMovimientos: proyeccion.generarMovimientos || false
      });
    } else {
      setFormData({ 
        id: null, 
        categoriaId: '', 
        subcategoriaId: '', 
        descripcion: '', 
        responsable: '', 
        monto: '',
        diaVencimiento: '',
        tipoGasto: 'fijo',
        frecuencia: 'Única',
        fechaInicio: new Date(mes + '-01T12:00:00').toISOString().substring(0, 10),
        fechaFin: '',
        generarMovimientos: false
      });
    }
    setIsModalOpen(true);
  };

  const handleToggleTipoGastoProyeccion = async (p, e) => {
    if (e) e.stopPropagation();
    if (p.isVirtual) return;
    const nuevoTipo = p.tipoGasto === 'variable' ? 'fijo' : 'variable';
    await updateProyeccion(p.id, { tipoGasto: nuevoTipo });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.categoriaId || !formData.subcategoriaId || !formData.monto) {
      alert('Por favor, selecciona una categoría, una subcategoría y un monto válido.');
      return;
    }

    setLoading(true);
    try {
      const cat = categorias.find(c => c.id === formData.categoriaId);
      if (!cat) {
        alert('Categoría no encontrada');
        setLoading(false);
        return;
      }

      const diaNum = formData.diaVencimiento !== '' && formData.diaVencimiento !== null
        ? Number(formData.diaVencimiento)
        : null;

      if (formData.id) {
        let updateFuture = false;
        if (formData.frecuencia !== 'Única' && formData.generarMovimientos) {
          updateFuture = window.confirm("¿Deseás actualizar también los movimientos futuros pendientes generados desde esta proyección?");
        }

        await updateProyeccion(formData.id, {
          categoriaId: formData.categoriaId,
          subcategoriaId: formData.subcategoriaId,
          montoProyectado: Number(formData.monto),
          diaVencimiento: diaNum,
          tipo: cat.tipo,
          tipoGasto: formData.tipoGasto || 'fijo',
          descripcion: formData.descripcion,
          responsable: formData.responsable
        });

        if (updateFuture) {
          const futureMovs = (movimientos || []).filter(m => m.proyeccionId === formData.id && m.estado === 'pendiente' && m.fecha >= formData.fechaInicio);
          const promises = futureMovs.map(m => updateMovimiento(m.id, {
            categoriaId: formData.categoriaId,
            subcategoriaId: formData.subcategoriaId,
            monto: Number(formData.monto),
            tipo: cat.tipo,
            descripcion: formData.descripcion,
            responsable: formData.responsable
          }));
          await Promise.all(promises);
        }
      } else {
        await saveProyeccion({
          mes, 
          categoriaId: formData.categoriaId, 
          monto: formData.monto,
          montoProyectado: Number(formData.monto),
          diaVencimiento: diaNum,
          tipo: cat.tipo, 
          tipoGasto: formData.tipoGasto || 'fijo',
          descripcion: formData.descripcion, 
          subcategoriaId: formData.subcategoriaId, 
          responsable: formData.responsable,
          frecuencia: 'Única',
          fechaInicio: '',
          fechaFin: '',
          generarMovimientos: false
        });
      }
      
      setIsModalOpen(false);
      setFormData({ 
        id: null, categoriaId: '', subcategoriaId: '', descripcion: '', responsable: '', monto: '', diaVencimiento: '',
        tipoGasto: 'fijo', frecuencia: 'Única', fechaInicio: new Date().toISOString().substring(0, 10), fechaFin: '', generarMovimientos: false
      });
      alert('Proyección guardada correctamente');
    } catch (error) {
      console.error("Error al guardar:", error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta proyección? Los movimientos pendientes generados desde ella NO se eliminarán automáticamente.')) {
      setLoading(true);
      await deleteProyeccion(id);
      setLoading(false);
    }
  };

  const duplicarMesAnterior = async () => {
    const date = new Date(mes + '-01');
    date.setMonth(date.getMonth() - 1);
    const mesAnterior = date.toISOString().substring(0, 7);

    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'proyecciones'), where('mes', '==', mesAnterior)));
      const anteriores = snap.empty ? [] : snap.docs.map(docSnap => docSnap.data());

      if (anteriores.length === 0) {
        alert(`No hay proyecciones cargadas en el mes anterior (${mesAnterior}).`);
        return;
      }

      const existentesMesActual = proyecciones.filter(p => p.mes === mes);

      const esMismaProyeccion = (base, existente) => {
        const subBase = base.subcategoriaId || base.subcategoria || '';
        const subExistente = existente.subcategoriaId || existente.subcategoria || '';

        return (
          base.categoriaId === existente.categoriaId &&
          subBase === subExistente &&
          (base.tipo || '') === (existente.tipo || '') &&
          (base.descripcion || '') === (existente.descripcion || '') &&
          (base.responsable || '') === (existente.responsable || '')
        );
      };

      const aDuplicar = anteriores.filter(d =>
        !existentesMesActual.some(existente => esMismaProyeccion(d, existente))
      );

      const promises = aDuplicar.map(d => {
        const subId = d.subcategoriaId || d.subcategoria || '';
        return saveProyeccion({
          mes,
          categoriaId: d.categoriaId,
          montoProyectado: Number(d.montoProyectado !== undefined && d.montoProyectado !== null ? d.montoProyectado : (d.monto || 0)),
          diaVencimiento: d.diaVencimiento || null,
          tipo: d.tipo,
          tipoGasto: d.tipoGasto || 'fijo',
          descripcion: d.descripcion || '',
          subcategoriaId: subId,
          responsable: d.responsable || '',
          frecuencia: 'Única',
          fechaInicio: '',
          fechaFin: '',
          generarMovimientos: false
        });
      });

      await Promise.all(promises);

      const omitidas = anteriores.length - aDuplicar.length;
      alert(`Se duplicaron ${aDuplicar.length} proyecciones desde ${mesAnterior}.${omitidas > 0 ? `\nSe omitieron ${omitidas} porque ya existían en ${mes}.` : ''}`);
    } catch (error) {
      console.error('Error duplicando mes anterior:', error);
      alert('No se pudo duplicar el mes anterior: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resumenTotales = useMemo(() => {
    const ingresos = proyeccionesList
      .filter(p => (p.tipo || categorias.find(c => c.id === p.categoriaId)?.tipo) === 'ingreso')
      .reduce((acc, p) => acc + (Number(p.montoProyectado !== undefined && p.montoProyectado !== null ? p.montoProyectado : p.monto) || 0), 0);

    const egresos = proyeccionesList
      .filter(p => (p.tipo || categorias.find(c => c.id === p.categoriaId)?.tipo) === 'egreso');

    const gastosFijos = egresos
      .filter(p => p.tipoGasto !== 'variable')
      .reduce((acc, p) => acc + (Number(p.montoProyectado !== undefined && p.montoProyectado !== null ? p.montoProyectado : p.monto) || 0), 0);

    const gastosVariables = egresos
      .filter(p => p.tipoGasto === 'variable')
      .reduce((acc, p) => acc + (Number(p.montoProyectado !== undefined && p.montoProyectado !== null ? p.montoProyectado : p.monto) || 0), 0);

    const totalGastos = gastosFijos + gastosVariables;
    const saldo = ingresos - totalGastos;

    return { ingresos, gastosFijos, gastosVariables, totalGastos, saldo };
  }, [proyeccionesList, categorias]);

  const renderTable = (tipo) => {
    const list = proyeccionesList.filter(p => {
      // Búsqueda
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (p.descripcion && p.descripcion.toLowerCase().includes(searchLower)) ||
        (categorias.find(c => c.id === p.categoriaId)?.nombre.toLowerCase().includes(searchLower)) ||
        (subcategorias.find(s => s.id === p.subcategoriaId)?.nombre.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;


      // Filtro por naturaleza (Fijo vs Variable)
      if (filterNaturaleza === 'fijo') {
        if (p.tipoGasto === 'variable') return false;
      } else if (filterNaturaleza === 'variable') {
        if (p.tipoGasto !== 'variable') return false;
      }

      if (p.tipo) return p.tipo === tipo;
      const cat = categorias.find(c => c.id === p.categoriaId);
      return cat?.tipo === tipo;
    });
    const grouped = {};
    list.forEach(p => {
       if(!grouped[p.categoriaId]) grouped[p.categoriaId] = [];
       grouped[p.categoriaId].push(p);
    });

    return (
      <div className="relative w-full overflow-auto mt-4">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50/60">
            <tr>
              <th className="h-9 px-2 text-left font-semibold text-muted-foreground text-xs">Subcategoría</th>
              <th className="h-9 px-2 text-center font-semibold text-muted-foreground text-xs w-24">Tipo</th>
              <th className="h-9 px-2 text-center font-semibold text-muted-foreground text-xs w-24">Vencimiento</th>
              <th className="h-9 px-2 text-left font-semibold text-muted-foreground text-xs">Responsable</th>
              <th className="h-9 px-2 text-left font-semibold text-muted-foreground text-xs">Descripción</th>
              <th className="h-9 px-2 text-right font-semibold text-muted-foreground text-xs">Monto Proyectado</th>
              <th className="h-9 px-2 text-right w-10"></th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center text-muted-foreground italic">Sin proyecciones</td>
              </tr>
            ) : (
              Object.keys(grouped).map(catId => {
                const cat = categorias.find(c => c.id === catId);
                const items = grouped[catId];
                return (
                  <Fragment key={catId}>
                    <tr className="bg-muted/40">
                      <td colSpan="7" className="p-2 font-bold text-sm text-slate-800">
                        {cat?.icono || '📁'} {cat?.nombre || 'Categoría desconocida'}
                      </td>
                    </tr>
                    {items.map(p => (
                      <tr key={p.id} className={cn("border-b hover:bg-muted/50 transition-colors", p.isVirtual ? "bg-slate-50/40" : "")}>
                        <td className="p-2 pl-6 font-medium text-indigo-600">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{subcategorias.find(s => s.id === p.subcategoriaId)?.nombre || <span className="text-muted-foreground italic">Sin subcategoría</span>}</span>
                            {p.isVirtual && (
                              <span className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                p.virtualType === 'Tarjeta' ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-purple-50 text-purple-700 border border-purple-200"
                              )}>
                                {p.virtualType === 'Tarjeta' ? '💳 Tarjeta' : '🔄 Recurrente'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Columna Tipo (Fijo / Variable) */}
                        <td className="p-2 text-center whitespace-nowrap">
                          {!p.isVirtual ? (
                            <button
                              type="button"
                              onClick={(e) => handleToggleTipoGastoProyeccion(p, e)}
                              title="Clic para alternar entre Fijo y Variable"
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all hover:scale-105 cursor-pointer shadow-2xs inline-flex items-center gap-1",
                                p.tipoGasto === 'variable'
                                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                              )}
                            >
                              {p.tipoGasto === 'variable' ? '🌊 Variable' : '📌 Fijo'}
                            </button>
                          ) : (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1",
                              p.tipoGasto === 'variable'
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            )}>
                              {p.tipoGasto === 'variable' ? '🌊 Variable' : '📌 Fijo'}
                            </span>
                          )}
                        </td>

                        {/* Columna Vencimiento */}
                        <td className="p-2 text-center whitespace-nowrap">
                          {p.diaVencimiento ? (
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              📅 Día {p.diaVencimiento}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">-</span>
                          )}
                        </td>

                        <td className="p-2 text-sm text-slate-700">
                          {p.responsable || <span className="text-muted-foreground/50 text-xs">Sin asignar</span>}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground truncate max-w-[140px]" title={p.descripcion}>
                          {p.descripcion || '-'}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-800 whitespace-nowrap">
                          ${(p.montoProyectado || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right flex justify-end gap-1">
                          {!p.isVirtual ? (
                            <>
                              <Button variant="ghost" size="sm" className="text-indigo-600 h-7 w-7 p-0" onClick={() => handleOpenModal(p)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0" onClick={() => handleDelete(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic px-2">Automático</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Selector de modo de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            Presupuesto Mensual
          </h2>
          <p className="text-muted-foreground text-sm">
            {modoVista === 'vencimientos' 
              ? 'Agenda cronológica consolidada: boletas fijas y resúmenes de tarjetas para saber cuánto dinero necesitás cada semana.'
              : 'Gestiona tus ingresos y gastos proyectados para cada mes.'}
          </p>
        </div>

        <div className="inline-flex p-1 bg-muted rounded-lg text-xs font-bold w-fit">
          <button
            type="button"
            onClick={() => setModoVista('proyecciones')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all",
              modoVista === 'proyecciones' ? "bg-background text-foreground shadow-sm font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListFilter className="h-3.5 w-3.5 text-indigo-600" />
            Presupuesto Mensual
          </button>
          <button
            type="button"
            onClick={() => setModoVista('vencimientos')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all",
              modoVista === 'vencimientos' ? "bg-background text-indigo-700 shadow-sm font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            Calendario de Vencimientos
          </button>
        </div>
      </div>

      {modoVista === 'vencimientos' ? (
        <CalendarioVencimientos 
          mes={mes} 
          setMes={setMes} 
        />
      ) : (
        <>
      {/* BARRA HERO: NAVEGADOR DE MES Y ACCIONES PRINCIPALES */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* CONTROL DESTACADO DE MES */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-white border-2 border-indigo-200/90 rounded-2xl p-1.5 shadow-sm hover:border-indigo-400 transition-all">
              <button
                type="button"
                onClick={() => setMes(getMesAnterior(mes))}
                className="p-2 rounded-xl hover:bg-slate-100 active:scale-95 text-slate-700 transition-all cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="h-5 w-5 text-indigo-700" />
              </button>

              <div className="flex items-center gap-3 px-3 py-1">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-slate-900 capitalize tracking-tight">
                      {formatNombreMes(mes)}
                    </span>
                    {esMesActual ? (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                        Mes en curso
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                        Histórico / Proyectado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {proyeccionesList.length > 0 
                      ? `${proyeccionesList.length} presupuestos cargados` 
                      : 'Sin proyecciones cargadas'}
                  </p>
                </div>

                {/* Input de mes estilizado con botón de calendario */}
                <div className="relative ml-2">
                  <input 
                    type="month" 
                    className="p-2 pl-3 pr-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white text-xs font-bold text-slate-800 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer transition-all"
                    value={mes}
                    onChange={(e) => setMes(e.target.value)}
                    title="Seleccionar cualquier mes"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMes(getMesSiguiente(mes))}
                className="p-2 rounded-xl hover:bg-slate-100 active:scale-95 text-slate-700 transition-all cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="h-5 w-5 text-indigo-700" />
              </button>
            </div>

            {!esMesActual && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMes(mesActualHoy)}
                className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold gap-1.5 shadow-2xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Volver al Mes Actual</span>
              </Button>
            )}
          </div>

          {/* BOTONES PRINCIPALES DE ACCIÓN */}
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={duplicarMesAnterior} 
              disabled={loading}
              className="gap-2 font-bold rounded-xl border-indigo-300 text-indigo-800 hover:bg-indigo-100/60 shadow-2xs cursor-pointer py-2 px-3.5"
              title={`Clonar proyecciones desde ${formatNombreMes(getMesAnterior(mes))}`}
            >
              <Copy className="h-4 w-4 text-indigo-600" />
              <span>Duplicar Anterior</span>
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleOpenModal()}
              className="gap-2 font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer py-2 px-3.5"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Proyección</span>
            </Button>
          </div>
        </div>

        {/* FILA SECUNDARIA: BÚSQUEDA Y FILTRO */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por concepto o categoría..."
                className="pl-9 pr-4 py-2 text-xs border rounded-xl bg-white w-full outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              className="p-2 border rounded-xl bg-white text-xs font-semibold shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={filterNaturaleza}
              onChange={(e) => setFilterNaturaleza(e.target.value)}
            >
              <option value="todos">Todos los compromisos</option>
              <option value="fijo">📌 Solo Fijos / Obligaciones</option>
              <option value="variable">🌊 Solo Presupuesto Variable</option>
            </select>
          </div>
        </div>
      </div>

      {/* BANNER INFORMATIVO SI EL MES NO TIENE PROYECCIONES */}
      {proyeccionesList.length === 0 && (
        <div className="p-5 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
              <Copy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-black text-indigo-950 capitalize">
                {formatNombreMes(mes)} todavía no tiene proyecciones
              </p>
              <p className="text-xs text-indigo-900/80 mt-0.5 font-medium">
                Podés inicializar todo este mes clonando la estructura de {formatNombreMes(getMesAnterior(mes))} en un solo clic.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={duplicarMesAnterior}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 rounded-xl shadow-sm shrink-0 px-4 py-2 cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            <span>Duplicar desde {formatNombreMes(getMesAnterior(mes))}</span>
          </Button>
        </div>
      )}

      {/* Resumen Financiero: Fijos vs Variables */}
      <Card className="bg-slate-900 text-white shadow-md border-none overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="pt-2 md:pt-0">
              <p className="text-[11px] opacity-70 uppercase font-black tracking-wider text-emerald-400">Total Ingresos</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                ${resumenTotales.ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Previstos para el mes</span>
            </div>

            <div className="pt-2 md:pt-0">
              <p className="text-[11px] opacity-70 uppercase font-black tracking-wider text-indigo-400 flex items-center justify-center gap-1">
                <span>📌 Gastos Fijos</span>
              </p>
              <p className="text-2xl font-black text-indigo-300 mt-1">
                ${resumenTotales.gastosFijos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-indigo-200/60 font-medium">Obligaciones ineludibles</span>
            </div>

            <div className="pt-2 md:pt-0">
              <p className="text-[11px] opacity-70 uppercase font-black tracking-wider text-amber-400 flex items-center justify-center gap-1">
                <span>🌊 Presupuesto Variable</span>
              </p>
              <p className="text-2xl font-black text-amber-300 mt-1">
                ${resumenTotales.gastosVariables.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-amber-200/60 font-medium">Margen flexible / Consumo</span>
            </div>

            <div className="pt-2 md:pt-0">
              <p className="text-[11px] opacity-70 uppercase font-black tracking-wider text-rose-400">Total Gastos</p>
              <p className="text-2xl font-black text-rose-400 mt-1">
                ${resumenTotales.totalGastos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Fijos + Variables</span>
            </div>

            <div className="pt-2 md:pt-0 col-span-2 md:col-span-1">
              <p className="text-[11px] opacity-70 uppercase font-black tracking-wider text-cyan-400">Saldo Estimado</p>
              <p className={cn("text-2xl font-black mt-1", resumenTotales.saldo >= 0 ? "text-cyan-300" : "text-rose-400")}>
                ${resumenTotales.saldo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">
                {resumenTotales.saldo >= 0 ? 'Superávit planificado' : 'Déficit proyectado'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="border-b bg-emerald-50/30">
            <CardTitle className="text-emerald-700">Ingresos Proyectados</CardTitle>
          </CardHeader>
          <CardContent>
            {renderTable('ingreso')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-rose-50/30">
            <CardTitle className="text-rose-700">Gastos Proyectados</CardTitle>
          </CardHeader>
          <CardContent>
            {renderTable('egreso')}
          </CardContent>
        </Card>
      </div>
        </>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={formData.id ? "Editar Proyección" : "Agregar Proyección"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <select 
              className="w-full p-2 border rounded-md bg-background"
              required
              value={formData.categoriaId}
              onChange={(e) => setFormData({...formData, categoriaId: e.target.value})}
            >
              <option value="">Seleccionar categoría...</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre} ({c.tipo})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Subcategoría</label>
            <select 
              className="w-full p-2 border rounded-md bg-background" 
              required
              value={formData.subcategoriaId} 
              onChange={(e) => setFormData({...formData, subcategoriaId: e.target.value})}
              disabled={!formData.categoriaId}
            >
              <option value="">Seleccionar subcategoría...</option>
              {subcategorias
                .filter(s => s.categoriaId === formData.categoriaId)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))
              }
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Responsable</label>
            <select 
              className="w-full p-2 border rounded-md bg-background" 
              value={formData.responsable}
              onChange={(e) => setFormData({...formData, responsable: e.target.value})}
            >
              <option value="">Sin asignar</option>
              <option value="Familia">Familia</option>
              <option value="Andres">Andres</option>
              <option value="Cecilia">Cecilia</option>
              <option value="Agustin">Agustin</option>
            </select>
          </div>

          {/* Naturaleza de la Proyección: Fijo vs Variable */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Naturaleza de la Proyección</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipoGasto: 'fijo' })}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer",
                  (formData.tipoGasto === 'fijo' || !formData.tipoGasto)
                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
              >
                <span className="font-bold text-sm flex items-center gap-1.5">
                  📌 Gasto / Ingreso Fijo
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  Obligación mensual ineludible, cuota, servicio o tratamiento recurrente.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipoGasto: 'variable' })}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all flex flex-col gap-1 cursor-pointer",
                  formData.tipoGasto === 'variable'
                    ? "bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                )}
              >
                <span className="font-bold text-sm flex items-center gap-1.5">
                  🌊 Presupuesto Variable
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  Techo o margen estimativo para gastos flexibles del mes (supermercado, salidas, extras).
                </span>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción (opcional)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md bg-background text-sm" 
              placeholder="Notas adicionales..."
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto Proyectado</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded-md bg-background font-bold" 
                placeholder="0"
                required
                value={formData.monto}
                onChange={(e) => setFormData({...formData, monto: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center justify-between">
                <span>Día de Vencimiento</span>
                <span className="text-[11px] text-muted-foreground font-normal">Opcional (1 al 31)</span>
              </label>
              <input 
                type="number" 
                min="1"
                max="31"
                className="w-full p-2 border rounded-md bg-background" 
                placeholder="Ej: 10"
                value={formData.diaVencimiento}
                onChange={(e) => setFormData({...formData, diaVencimiento: e.target.value})}
              />
            </div>
          </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {formData.id ? "Actualizar Proyección" : "Guardar Proyección"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Proyecciones;
