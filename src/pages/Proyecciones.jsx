import { Fragment, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Copy, Plus, Trash2, Edit, Search, ListFilter, Repeat, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { CalendarioVencimientos } from '../components/proyecciones/CalendarioVencimientos';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';

const Proyecciones = () => {
  const { categorias, subcategorias, proyecciones, movimientos, saveProyeccion, updateProyeccion, updateMovimiento, deleteProyeccion } = useData();
  const [modoVista, setModoVista] = useState('proyecciones'); // 'proyecciones' | 'vencimientos'
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [soloRecurrentes, setSoloRecurrentes] = useState(false);
  const [filterNaturaleza, setFilterNaturaleza] = useState('todos'); // 'todos', 'fijo', 'variable'
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
    const proManuales = proyecciones.filter(p => {
      const freq = p.frecuencia || 'Única';
      if (freq === 'Única') {
        return p.mes === mes;
      }

      const startMonth = p.fechaInicio ? p.fechaInicio.substring(0, 7) : p.mes;
      const endMonth = p.fechaFin ? p.fechaFin.substring(0, 7) : null;
      
      if (mes < startMonth) return false;
      if (endMonth && mes > endMonth) return false;

      const dStart = new Date(startMonth + '-01');
      const dCurrent = new Date(mes + '-01');
      const diffMonths = (dCurrent.getFullYear() - dStart.getFullYear()) * 12 + (dCurrent.getMonth() - dStart.getMonth());

      switch(freq) {
        case 'Mensual': return true;
        case 'Bimestral': return diffMonths % 2 === 0;
        case 'Trimestral': return diffMonths % 3 === 0;
        case 'Semestral': return diffMonths % 6 === 0;
        case 'Anual': return diffMonths % 12 === 0;
        default: return false;
      }
    });
    return proManuales;
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
      const unicas = snap.empty ? [] : snap.docs
        .map(docSnap => docSnap.data())
        .filter(d => (d.frecuencia || 'Única') === 'Única');

      if (unicas.length === 0) {
        alert('No hay proyecciones únicas en el mes anterior.\nLas recurrentes (Mensual, Anual, etc.) ya aparecen automáticamente.');
        return;
      }

      const existentesMesActual = proyecciones.filter(p =>
        p.mes === mes &&
        (p.frecuencia || 'Única') === 'Única'
      );

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

      const aDuplicar = unicas.filter(d =>
        !existentesMesActual.some(existente => esMismaProyeccion(d, existente))
      );

      const promises = aDuplicar.map(d => {
        const subId = d.subcategoriaId || d.subcategoria || '';
        return saveProyeccion({
          mes,
          categoriaId: d.categoriaId,
          montoProyectado: d.montoProyectado,
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

      const omitidas = unicas.length - aDuplicar.length;
      alert(`Se duplicaron ${aDuplicar.length} proyección(es) única(s).${omitidas > 0 ? `\nSe omitieron ${omitidas} porque ya existían en ${mes}.` : ''}\nLas recurrentes ya están incluidas automáticamente.`);
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

      // Filtro solo recurrentes
      if (soloRecurrentes) {
        if ((p.frecuencia || 'Única') === 'Única' && !p.isVirtual) return false;
      }

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Planifica tus ingresos y gastos para cada mes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 text-sm border rounded-md bg-background w-[150px] md:w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <input 
            type="month" 
            className="p-2 border rounded-md bg-background text-sm font-medium"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
          <Button
            type="button"
            variant={soloRecurrentes ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloRecurrentes(!soloRecurrentes)}
            className={cn(
              "text-xs font-semibold gap-1.5 transition-all",
              soloRecurrentes 
                ? "bg-purple-700 text-white hover:bg-purple-800 border-purple-700 shadow-sm" 
                : "border-slate-200 text-slate-700 hover:bg-purple-50 hover:text-purple-700"
            )}
            title="Mostrar únicamente proyecciones recurrentes"
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>Solo Recurrentes</span>
            {soloRecurrentes && (
              <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-purple-900 text-purple-200 rounded-full">On</span>
            )}
          </Button>
          <select 
            className="p-1.5 border rounded-md bg-background text-xs font-semibold shadow-xs outline-none focus:ring-2 focus:ring-primary/20"
            value={filterNaturaleza}
            onChange={(e) => setFilterNaturaleza(e.target.value)}
          >
            <option value="todos">Todos los compromisos</option>
            <option value="fijo">📌 Solo Fijos / Obligaciones</option>
            <option value="variable">🌊 Solo Presupuesto Variable</option>
          </select>
          <Button variant="outline" size="sm" onClick={duplicarMesAnterior} disabled={loading}>
            <Copy className="mr-2 h-4 w-4" /> Duplicar Anterior
          </Button>
          <Button size="sm" onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Proyección
          </Button>
        </div>
      </div>

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
