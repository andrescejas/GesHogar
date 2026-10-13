import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ImportadorModal from '../components/importador/ImportadorModal';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';
import { getOrigenCuenta as resolverOrigenCuenta } from '../lib/cuentaHelper';

const Movimientos = () => {
  const { movimientos, categorias, subcategorias, tarjetas, proyecciones, addMovimiento, updateMovimiento, deleteMovimiento, saveProyeccion, updateProyeccion, deleteProyeccion, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTarjetas, setFilterTarjetas] = useState([]);
  const [filterResponsable, setFilterResponsable] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterSinCategoria, setFilterSinCategoria] = useState('todas');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterSubcategoria, setFilterSubcategoria] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const tarjetasDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tarjetasDropdownRef.current && !tarjetasDropdownRef.current.contains(event.target)) {
        tarjetasDropdownRef.current.removeAttribute('open');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    fechaPago: '',
    tipo: 'egreso',
    categoriaId: '',
    subcategoriaId: '',
    descripcion: '',
    comentario: '',
    monto: '',
    responsable: '',
    estado: 'pagado',
    medioPago: 'Efectivo',
    tarjeta: '',
    cuentaOrigen: 'efectivo',
    cuentaOrigenLabel: '💵 Efectivo (Manual)',
    origen: 'manual',
    cantidadCuotas: '1',
    fechaPrimeraCuota: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    esCuota: false,
    proyeccionId: null,
    frecuencia: 'Única',
    estadoRecurrencia: 'Activa',
    fechaInicioProyeccion: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  });

  const getTarjeta = (valor) => {
    if (!valor) return null;
    return tarjetas.find(t => t.id === valor) ||
      tarjetas.find(t => t.nombre?.toLowerCase().trim() === valor.toLowerCase().trim()) ||
      null;
  };

  const sumarMeses = (fecha, cantidadMeses) => {
    const date = new Date(`${fecha}T00:00:00`);
    date.setMonth(date.getMonth() + cantidadMeses);
    return date.toISOString().split('T')[0];
  };

  const formatearMesCuota = (fecha) => {
    if (!fecha) return '';
    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getIntervaloMeses = (frecuencia) => {
    switch (frecuencia) {
      case 'Bimestral': return 2;
      case 'Trimestral': return 3;
      case 'Semestral': return 6;
      case 'Anual': return 12;
      default: return 1;
    }
  };

  const getFechaInicioProyeccion = (fechaMovimiento, fechaElegida, frecuencia) => {
    let fechaInicio = fechaElegida || fechaMovimiento;
    const mesMovimiento = fechaMovimiento.substring(0, 7);
    const intervalo = getIntervaloMeses(frecuencia);

    while (fechaInicio.substring(0, 7) <= mesMovimiento) {
      fechaInicio = sumarMeses(fechaInicio, intervalo);
    }

    return fechaInicio;
  };

  const responsables = Array.from(
    new Set([
      'Familia',
      'Andres',
      'Cecilia',
      'Agustin',
      ...movimientos.map(m => m.responsable).filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b));

  const getOrigenCuenta = useCallback((m) => {
    return resolverOrigenCuenta(m, tarjetas);
  }, [tarjetas]);

  const cuentasConMovimientos = useMemo(() => {
    const movsDelPeriodo = mes ? movimientos.filter(m => m.fecha.startsWith(mes)) : movimientos;
    const mapa = {};
    movsDelPeriodo.forEach(m => {
      const oc = getOrigenCuenta(m);
      if (!mapa[oc.id]) {
        mapa[oc.id] = { id: oc.id, label: oc.label, icono: oc.icono, count: 0 };
      }
      mapa[oc.id].count++;
    });
    return Object.values(mapa).sort((a, b) => b.count - a.count);
  }, [movimientos, getOrigenCuenta, mes]);

  const opcionesCuentas = useMemo(() => {
    const list = [
      { id: 'efectivo', label: '💵 Efectivo (Manual)' }
    ];

    tarjetas.filter(t => t.activa).forEach(t => {
      let icono = '💳';
      const nom = (t.nombre || '').toLowerCase();
      if (nom.includes('mercado') || nom.includes('meli')) icono = '🔷';
      else if (nom.includes('bancor') || nom.includes('córdoba') || nom.includes('cordoba')) icono = '🏛️';
      else if (nom.includes('santander')) icono = '🔴';
      else if (nom.includes('naranja')) icono = '🟠';
      list.push({ id: t.id, label: `${icono} ${t.nombre}` });
    });

    if (formData.cuentaOrigen && !list.some(item => item.id === formData.cuentaOrigen)) {
      list.push({
        id: formData.cuentaOrigen,
        label: formData.cuentaOrigenLabel || formData.cuentaOrigen
      });
    }

    return list;
  }, [tarjetas, formData.cuentaOrigen, formData.cuentaOrigenLabel]);

  const handleTipoFiltroChange = (nuevoTipo) => {
    setFilterTipo(nuevoTipo);
    if (nuevoTipo && filterCategoria) {
      const cat = categorias.find(c => c.id === filterCategoria);
      if (cat && cat.tipo !== nuevoTipo) {
        setFilterCategoria('');
        setFilterSubcategoria('');
      }
    }
  };

  const categoriasParaFiltro = useMemo(() => {
    if (!filterTipo) return categorias;
    return categorias.filter(c => c.tipo === filterTipo);
  }, [categorias, filterTipo]);

  const subcategoriasParaFiltro = useMemo(() => {
    if (!filterCategoria) return [];
    return subcategorias.filter(s => s.categoriaId === filterCategoria);
  }, [subcategorias, filterCategoria]);

  const countSinCategoria = useMemo(() => {
    const movsDelPeriodo = mes ? movimientos.filter(m => m.fecha.startsWith(mes)) : movimientos;
    return movsDelPeriodo.filter(m => {
      if (filterTipo && m.tipo !== filterTipo) return false;
      return !m.categoriaId || !categorias.some(c => c.id === m.categoriaId);
    }).length;
  }, [movimientos, mes, categorias, filterTipo]);

  const toggleFilterTarjeta = (tarjetaId) => {
    setFilterTarjetas(prev =>
      prev.includes(tarjetaId)
        ? prev.filter(id => id !== tarjetaId)
        : [...prev, tarjetaId]
    );
  };

  const filterTarjetasLabel = useMemo(() => {
    if (filterTarjetas.length === 0) return 'Todas las cuentas / tarjetas';
    if (filterTarjetas.length === 1) {
      const encontrada = cuentasConMovimientos.find(c => c.id === filterTarjetas[0]);
      return encontrada ? `${encontrada.icono} ${encontrada.label}` : '1 seleccionada';
    }
    return `${filterTarjetas.length} seleccionadas`;
  }, [filterTarjetas, cuentasConMovimientos]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.categoriaId || !formData.subcategoriaId) {
        alert('Debes seleccionar una Categoría y una Subcategoría.');
        return;
      }

      const montoNum = Number(formData.monto);
      if (!montoNum || montoNum <= 0) {
        alert('Debes ingresar un monto válido mayor a 0.');
        return;
      }

      // Resolver cuenta y tarjeta seleccionada
      let tarjetaFinal = '';
      let medioPagoFinal = 'Efectivo';
      let origenFinal = formData.origen || (editingId ? 'manual' : 'manual');

      if (formData.cuentaOrigen === 'efectivo' || formData.cuentaOrigen === 'medio_efectivo') {
        tarjetaFinal = '';
        medioPagoFinal = 'Efectivo';
        origenFinal = 'manual';
      } else {
        const tarjetaEncontrada = tarjetas.find(t => t.id === formData.cuentaOrigen);
        if (tarjetaEncontrada) {
          tarjetaFinal = tarjetaEncontrada.id;
          medioPagoFinal = tarjetaEncontrada.nombre;
          if (!editingId || origenFinal === 'manual') {
            origenFinal = tarjetaEncontrada.nombre;
          }
        } else {
          tarjetaFinal = formData.cuentaOrigen;
          medioPagoFinal = formData.cuentaOrigenLabel || formData.cuentaOrigen;
        }
      }

      const data = {
        fecha: formData.fecha,
        tipo: formData.tipo,
        categoriaId: formData.categoriaId,
        subcategoriaId: formData.subcategoriaId,
        descripcion: (formData.descripcion || '').trim(),
        comentario: (formData.comentario || '').trim(),
        monto: montoNum,
        responsable: formData.responsable || 'Andres',
        estado: formData.estado || 'pagado',
        medioPago: medioPagoFinal,
        tarjeta: tarjetaFinal,
        etiquetaEspecial: formData.etiquetaEspecial || '',
        esCuota: formData.esCuota || false,
        fechaPago: formData.estado === 'pagado' ? formData.fecha : (formData.fechaPago || ''),
        contabiliza: formData.contabiliza !== undefined ? formData.contabiliza : true,
        mes: formData.fecha.substring(0, 7),
        origen: origenFinal
      };

      if (!editingId) {
        data.fechaCarga = new Date().toISOString();
        await addMovimiento(data);
      } else {
        await updateMovimiento(editingId, data);
      }

      closeModal();
    } catch (error) {
      console.error("Error al guardar movimiento:", error);
      alert("Hubo un error al guardar: " + error.message);
    }
  };

  const handleEdit = (m) => {
    const proyeccion = m.proyeccionId
      ? proyecciones.find(p => p.id === m.proyeccionId)
      : null;

    const oc = resolverOrigenCuenta(m, tarjetas);

    setEditingId(m.id);
    setFormData({
      fecha: m.fecha,
      tipo: m.tipo,
      categoriaId: m.categoriaId || '',
      subcategoriaId: m.subcategoriaId || '',
      descripcion: m.descripcion || '',
      comentario: m.comentario || '',
      monto: m.monto,
      responsable: m.responsable || '',
      estado: m.estado === 'proyectado' ? 'pendiente' : m.estado,
      medioPago: m.medioPago || 'Efectivo',
      tarjeta: m.tarjeta || '',
      cuentaOrigen: m.tarjeta || oc.id,
      cuentaOrigenLabel: `${oc.icono} ${oc.label}`,
      origen: m.origen || oc.label,
      etiquetaEspecial: m.etiquetaEspecial || '',
      cantidadCuotas: m.cantidadCuotas?.toString() || '1',
      fechaPrimeraCuota: m.fechaPrimeraCuota || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      esCuota: m.esCuota || false,
      fechaPago: m.fechaPago || '',
      proyeccionId: m.proyeccionId || null,
      frecuencia: proyeccion?.frecuencia || 'Única',
      estadoRecurrencia: proyeccion?.estado || 'Activa',
      fechaInicioProyeccion: proyeccion?.fechaInicio || m.fecha || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const mov = movimientos.find(m => m.id === id);
    if (!mov) return;

    if (mov.proyeccionId) {
      if (window.confirm('Este movimiento se genera automaticamente desde una proyeccion recurrente. Si solo se elimina el movimiento, volvera a aparecer. Deseas eliminar tambien la recurrencia y sus movimientos pendientes?')) {
        try {
          const relacionadosPendientes = movimientos.filter(m =>
            m.proyeccionId === mov.proyeccionId &&
            (m.estado === 'pendiente' || m.id === mov.id)
          );
          await Promise.all(relacionadosPendientes.map(r => deleteMovimiento(r.id)));
          await deleteProyeccion(mov.proyeccionId);
          alert('Recurrencia y movimientos pendientes eliminados correctamente.');
        } catch (error) {
          console.error("Error al eliminar recurrencia:", error);
          alert("Error al eliminar la recurrencia.");
        }
      }
    } else if (mov.compraId) {
      if (window.confirm('Este movimiento pertenece a una compra financiada en cuotas. ¿Deseas eliminar TODAS las cuotas y el movimiento de referencia de esta compra?')) {
        try {
          const relacionados = movimientos.filter(m => m.compraId === mov.compraId);
          const promesas = relacionados.map(r => deleteMovimiento(r.id));
          await Promise.all(promesas);
          alert('Compra financiada y todas sus cuotas eliminadas correctamente.');
        } catch (error) {
          console.error("Error al eliminar compra financiada:", error);
          alert("Error al eliminar la compra financiada.");
        }
      }
    } else {
      if (window.confirm('¿Estás seguro de eliminar este movimiento?')) {
        await deleteMovimiento(id);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'egreso',
      categoriaId: '',
      subcategoriaId: '',
      descripcion: '',
      comentario: '',
      monto: '',
      responsable: 'Andres',
      estado: 'pagado',
      medioPago: 'Efectivo',
      tarjeta: '',
      cuentaOrigen: 'efectivo',
      cuentaOrigenLabel: '💵 Efectivo (Manual)',
      origen: 'manual',
      etiquetaEspecial: '',
      esCuota: false,
      fechaPago: '',
      proyeccionId: null
    });
  };

  const filteredMovimientos = movimientos.filter(m => {
    if (mes && !m.fecha.startsWith(mes)) return false;
    if (filterTarjetas.length > 0) {
      const oc = getOrigenCuenta(m);
      if (!filterTarjetas.includes(oc.id)) return false;
    }
    if (filterResponsable === '__sin_asignar__' && m.responsable) return false;
    if (filterResponsable && filterResponsable !== '__sin_asignar__' && (m.responsable || '') !== filterResponsable) return false;

    // Filtro por tipo
    if (filterTipo && m.tipo !== filterTipo) return false;

    // Filtro por estado de categorización (aparte)
    if (filterSinCategoria === 'sin_categoria') {
      const tieneCat = m.categoriaId && categorias.some(c => c.id === m.categoriaId);
      if (tieneCat) return false;
    } else if (filterSinCategoria === 'con_categoria') {
      const tieneCat = m.categoriaId && categorias.some(c => c.id === m.categoriaId);
      if (!tieneCat) return false;
    }

    // Filtro por categoría específica
    if (filterCategoria && m.categoriaId !== filterCategoria) return false;

    // Filtro por subcategoría específica
    if (filterSubcategoria && m.subcategoriaId !== filterSubcategoria) return false;

    const search = searchTerm.toLowerCase();
    const categoriaNombre = categorias.find(c => c.id === m.categoriaId)?.nombre || '';
    const subcategoriaNombre = subcategorias.find(s => s.id === m.subcategoriaId)?.nombre || '';
    
    return (
      (m.descripcion || '').toLowerCase().includes(search) ||
      (m.comentario || '').toLowerCase().includes(search) ||
      categoriaNombre.toLowerCase().includes(search) ||
      subcategoriaNombre.toLowerCase().includes(search) ||
      (m.responsable || '').toLowerCase().includes(search) ||
      (m.tipo || '').toLowerCase().includes(search) ||
      (m.estado || '').toLowerCase().includes(search)
    );
  });

  const totalIngresos = filteredMovimientos.filter(m => m.tipo === 'ingreso' && m.estado !== 'proyectado' && m.contabiliza !== false).reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  const totalEgresos = filteredMovimientos.filter(m => m.tipo === 'egreso' && m.estado !== 'proyectado' && m.contabiliza !== false).reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  const saldo = totalIngresos - totalEgresos;

  const hoy = new Date().toISOString().split('T')[0];
  const movimientosManuales = movimientos.filter(m => 
    m.estado !== 'proyectado' && 
    !m.esCuota && 
    m.contabiliza !== false &&
    !m.proyeccionId &&
    !m.esRecurrenteAuto &&
    m.fecha <= hoy
  );
  
  const ultimaFechaCargada = movimientosManuales.length > 0
    ? movimientosManuales.reduce((max, m) => m.fecha > max ? m.fecha : max, movimientosManuales[0].fecha)
    : null;

  const formatFechaAAR = (fecha) => {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
  };

  if (loading) return <div className="flex items-center justify-center h-full">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Movimientos</h2>
          {ultimaFechaCargada && (
            <p className="text-sm text-muted-foreground mt-1">
              Último movimiento cargado: <span className="font-semibold text-slate-700">{formatFechaAAR(ultimaFechaCargada)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-semibold shadow-xs" 
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 text-indigo-600" />
            Importar Resumen
          </Button>
          <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo (Efectivo)
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-emerald-700 uppercase">Total Ingresos</p>
            <p className="text-2xl font-black text-emerald-600">${totalIngresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-rose-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-rose-700 uppercase">Total Egresos</p>
            <p className="text-2xl font-black text-rose-600">${totalEgresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-slate-50/50">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-700 uppercase">Saldo del Mes</p>
            <p className={cn("text-2xl font-black", saldo >= 0 ? "text-slate-800" : "text-rose-600")}>
              ${saldo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Historial de Transacciones</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <details ref={tarjetasDropdownRef} className="relative">
                <summary className="list-none [&::-webkit-details-marker]:hidden p-2 border rounded-md bg-background text-sm font-medium cursor-pointer min-w-[200px] flex items-center justify-between gap-3">
                  <span className="truncate">{filterTarjetasLabel}</span>
                  <span className="text-xs text-muted-foreground">▾</span>
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border bg-background shadow-lg p-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase">Cuentas con movimientos</span>
                    {filterTarjetas.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-indigo-600 font-semibold hover:underline"
                        onClick={() => setFilterTarjetas([])}
                      >
                        Limpiar ({filterTarjetas.length})
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 rounded text-sm font-medium hover:bg-accent flex items-center justify-between"
                    onClick={() => setFilterTarjetas([])}
                  >
                    <span>Todas las cuentas / tarjetas</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({mes ? movimientos.filter(m => m.fecha.startsWith(mes)).length : movimientos.length})
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
                              checked={filterTarjetas.includes(cuenta.id)}
                              onChange={() => toggleFilterTarjeta(cuenta.id)}
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
              <select
                className="p-2 border rounded-md bg-background text-sm font-medium"
                value={filterResponsable}
                onChange={(e) => setFilterResponsable(e.target.value)}
              >
                <option value="">Todos los responsables</option>
                <option value="__sin_asignar__">Sin asignar</option>
                {responsables.map(responsable => (
                  <option key={responsable} value={responsable}>{responsable}</option>
                ))}
              </select>
              {/* 1. Filtro Tipo */}
              <select
                className="p-2 border rounded-md bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                value={filterTipo}
                onChange={(e) => handleTipoFiltroChange(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="egreso">Egresos (Gastos)</option>
                <option value="ingreso">Ingresos</option>
              </select>

              {/* 2. Filtro Categoría */}
              <select
                className="p-2 border rounded-md bg-background text-sm font-medium disabled:opacity-50 outline-none focus:ring-2 focus:ring-primary/20"
                value={filterCategoria}
                onChange={(e) => {
                  setFilterCategoria(e.target.value);
                  setFilterSubcategoria('');
                  if (e.target.value && filterSinCategoria === 'sin_categoria') {
                    setFilterSinCategoria('todas');
                  }
                }}
                disabled={filterSinCategoria === 'sin_categoria'}
              >
                <option value="">
                  {filterTipo === 'egreso' ? 'Todas las categorías de gasto' : (filterTipo === 'ingreso' ? 'Todas las categorías de ingreso' : 'Todas las categorías')}
                </option>
                {filterTipo ? (
                  categoriasParaFiltro.map(categoria => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.icono} {categoria.nombre}
                    </option>
                  ))
                ) : (
                  <>
                    <optgroup label="── Egresos (Gastos) ──">
                      {categorias.filter(c => c.tipo !== 'ingreso').map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icono} {c.nombre}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── Ingresos ──">
                      {categorias.filter(c => c.tipo === 'ingreso').map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icono} {c.nombre}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>

              {/* 3. Filtro Subcategoría */}
              <select
                className="p-2 border rounded-md bg-background text-sm font-medium disabled:opacity-50 outline-none focus:ring-2 focus:ring-primary/20"
                value={filterSubcategoria}
                onChange={(e) => setFilterSubcategoria(e.target.value)}
                disabled={!filterCategoria || filterSinCategoria === 'sin_categoria'}
              >
                <option value="">Todas las subcategorías</option>
                {subcategoriasParaFiltro.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                ))}
              </select>

              <input 
                type="month" 
                className="p-2 border rounded-md bg-background text-sm font-medium"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-9 pr-4 py-2 text-sm border rounded-md bg-background w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* 4. Filtro Aparte: Sin Categoría (al final y abajo) */}
              <select
                className={cn(
                  "p-2 border rounded-md bg-background text-sm font-medium outline-none transition-colors",
                  filterSinCategoria === 'sin_categoria' && "border-amber-400 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-400"
                )}
                value={filterSinCategoria}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterSinCategoria(val);
                  if (val === 'sin_categoria') {
                    setFilterCategoria('');
                    setFilterSubcategoria('');
                  }
                }}
              >
                <option value="todas">Todas las categorías</option>
                <option value="sin_categoria" className="font-semibold text-amber-700">
                  Sin categoría {countSinCategoria > 0 ? `(${countSinCategoria})` : ''}
                </option>
                <option value="con_categoria">Con categoría</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 font-medium">
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Fecha</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Tipo</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Categoría</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Subcategoría</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Descripción</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Responsable</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Monto</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Estado</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Pago</th>
                  <th className="h-12 px-4 text-right align-middle text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredMovimientos.map((m) => (
                  <tr key={m.id} className={cn("border-b transition-colors hover:bg-muted/50 text-slate-800 font-medium", m.contabiliza === false ? "bg-slate-50/50 text-slate-400 opacity-80" : "")}>
                    <td className="p-4 align-middle whitespace-nowrap">{m.fecha}</td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase w-max",
                          m.tipo === 'ingreso' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        )}>
                          {m.tipo}
                        </span>
                        {(() => {
                          const oc = getOrigenCuenta(m);
                          return (
                            <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-bold w-max tracking-wide flex items-center gap-1">
                              <span>{oc.icono}</span>
                              <span>{oc.label}</span>
                            </span>
                          );
                        })()}
                        {m.etiquetaEspecial && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold w-max uppercase tracking-wider",
                            m.etiquetaEspecial === 'Débito Automático'
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-200 text-slate-700"
                          )}>
                            {m.etiquetaEspecial === 'Débito Automático' ? '🔄 ' : '🛡️ '}{m.etiquetaEspecial}
                          </span>
                        )}
                        {(m.proyeccionId || m.esRecurrenteAuto) && (
                          <span className="text-[10px] bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded font-bold w-max uppercase tracking-wider">
                            🔄 Proyección
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle whitespace-nowrap">
                      {categorias.find(c => c.id === m.categoriaId) ? (
                        <span>
                          {categorias.find(c => c.id === m.categoriaId)?.icono} {categorias.find(c => c.id === m.categoriaId)?.nombre}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-semibold">
                          ⚠️ Sin categoría
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {subcategorias.find(s => s.id === m.subcategoriaId)?.nombre || '-'}
                    </td>
                    <td className="p-4 align-middle max-w-[220px]" title={m.descripcion}>
                      <div className="flex flex-col gap-0.5">
                        <span className={cn("font-medium", m.contabiliza === false ? "font-normal text-slate-400" : "")}>
                          {m.descripcion}
                        </span>
                        {m.comentario && (
                          <span className="text-[11px] text-indigo-700 italic bg-indigo-50/80 border border-indigo-200/60 rounded px-1.5 py-0.5 w-max line-clamp-2" title={m.comentario}>
                            💬 {m.comentario}
                          </span>
                        )}
                        {m.tarjeta && (
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide">
                              💳 {getTarjeta(m.tarjeta)?.nombre || m.tarjeta}
                            </span>
                          )}
                        {m.esCuota && m.compraId && (() => {
                          const compraOrig = movimientos.find(mov => mov.id === m.compraId && mov.contabiliza === false);
                          return compraOrig ? (
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-normal">
                              📅 Comprado el {compraOrig.fecha.split('-').reverse().join('/')}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </td>
                    <td className="p-4 align-middle font-medium">{m.responsable || 'Sin asignar'}</td>
                    <td className="p-4 align-middle text-right font-medium">
                      {m.contabiliza === false ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-slate-400 font-normal">
                            ${(Number(m.monto) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-600 font-bold bg-slate-200/80 px-1 py-0.5 rounded mt-0.5 uppercase tracking-wider">
                            {m.etiquetaEspecial || 'Informativo'}
                          </span>
                        </div>
                      ) : (
                        <span>
                          {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase border",
                        m.estado === 'pagado' ? "bg-blue-100 text-blue-800 border-blue-200" : 
                        m.estado === 'pendiente' ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-800 border-slate-200"
                      )}>
                        {m.estado}
                      </span>
                    </td>
                    <td className="p-4 align-middle whitespace-nowrap text-xs text-slate-500 font-medium">
                      {m.estado === 'pagado' && m.fechaPago ? m.fechaPago.split('-').reverse().join('/') : '-'}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(m)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingId ? "Editar Movimiento" : "Nuevo Movimiento (Efectivo / Manual)"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* 1. Monto prominente */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Monto</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-xl">$</span>
              <input 
                type="number" 
                step="any"
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-2xl font-black text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
                required 
                value={formData.monto} 
                onChange={(e) => setFormData({...formData, monto: e.target.value})} 
                autoFocus={!editingId}
              />
            </div>
          </div>

          {/* 2. Descripción y Aclaración */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Descripción</label>
            <input 
              type="text" 
              placeholder="Ej: Verdulería feria, Café, Taxi, etc." 
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
              required 
              value={formData.descripcion} 
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Aclaración / Comentario (Opcional)</label>
            <input 
              type="text" 
              placeholder="Ej: Aclaración, detalle de compra o notas..." 
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
              value={formData.comentario || ''} 
              onChange={(e) => setFormData({...formData, comentario: e.target.value})} 
            />
          </div>

          {/* 3. Categoría y Subcategoría */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Categoría</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                required 
                value={formData.categoriaId} 
                onChange={(e) => setFormData({...formData, categoriaId: e.target.value, subcategoriaId: ''})}
                disabled={!!formData.proyeccionId}
              >
                <option value="">Seleccionar categoría...</option>
                {categorias
                  .filter(c => c.tipo.toLowerCase() === formData.tipo.toLowerCase())
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                  ))
                }
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Subcategoría</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                required
                value={formData.subcategoriaId} 
                onChange={(e) => setFormData({...formData, subcategoriaId: e.target.value})}
                disabled={!formData.categoriaId || !!formData.proyeccionId}
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
          </div>

          {/* 4. Fecha y Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Fecha</label>
              <input 
                type="date" 
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                required 
                value={formData.fecha} 
                onChange={(e) => setFormData({...formData, fecha: e.target.value})} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Tipo</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                value={formData.tipo} 
                onChange={(e) => setFormData({...formData, tipo: e.target.value, categoriaId: '', subcategoriaId: ''})} 
                disabled={!!formData.proyeccionId}
              >
                <option value="egreso">Egreso (Gasto)</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>
          </div>

          {/* 5. Responsable (Chips de 1 clic) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Responsable</label>
            <div className="flex gap-2">
              {['Familia', 'Andres', 'Cecilia', 'Agustin'].map((resp) => {
                const isSelected = (formData.responsable || 'Andres') === resp;
                return (
                  <button
                    key={resp}
                    type="button"
                    onClick={() => setFormData({ ...formData, responsable: resp })}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                      isSelected 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {resp}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Cuenta / Tarjeta de Origen y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Cuenta / Tarjeta de Origen</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                value={formData.cuentaOrigen || 'efectivo'} 
                onChange={(e) => {
                  const selVal = e.target.value;
                  const selObj = opcionesCuentas.find(o => o.id === selVal);
                  setFormData({ 
                    ...formData, 
                    cuentaOrigen: selVal,
                    cuentaOrigenLabel: selObj ? selObj.label : selVal
                  });
                }}
              >
                {opcionesCuentas.map(op => (
                  <option key={op.id} value={op.id}>{op.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Estado</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                value={formData.estado || 'pagado'} 
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              >
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          {formData.estado === 'pendiente' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Fecha Estimada de Pago</label>
              <input 
                type="date" 
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                value={formData.fechaPago || ''} 
                onChange={(e) => setFormData({ ...formData, fechaPago: e.target.value })} 
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={closeModal} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6 font-semibold">
              {editingId ? "Guardar Cambios" : "Guardar Movimiento"}
            </Button>
          </div>
        </form>
      </Modal>

      <ImportadorModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />
    </div>
  );
};

export default Movimientos;
