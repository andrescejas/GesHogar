import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ArrowRight, RefreshCw, ShieldCheck, Sparkles 
} from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { useData } from '../../context/DataContext';
import { parsearArchivoResumen } from '../../lib/parsers';

const ImportadorModal = ({ isOpen, onClose }) => {
  const { 
    categorias, 
    subcategorias, 
    movimientos, 
    tarjetas,
    reglas, 
    importarMovimientosBatch 
  } = useData();

  const [step, setStep] = useState(1); // 1: Carga, 2: Previsualización, 3: Éxito
  const [file, setFile] = useState(null);
  const [loadingParse, setLoadingParse] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Datos parseados
  const [parsedData, setParsedData] = useState(null);
  const [items, setItems] = useState([]);
  const [responsableDefault, setResponsableDefault] = useState('Andres');

  // Filtros en la vista previa
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'sin_categoria', 'computables', 'no_computan'

  const responsablesDisponibles = ['Familia', 'Andres', 'Cecilia', 'Agustin'];

  // Manejador de selección de archivo
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMsg('');
      const nameLower = selected.name.toLowerCase();
      if (nameLower.includes('bancor') || nameLower.startsWith('ca $') || nameLower.includes('cordobesa')) {
        setResponsableDefault('Cecilia');
      }
    }
  };

  // Procesar archivo
  const handleProcesarArchivo = async () => {
    if (!file) {
      setErrorMsg('Por favor selecciona un archivo (.csv, .xlsx, .xls o .pdf).');
      return;
    }

    setLoadingParse(true);
    setErrorMsg('');

    try {
      const res = await parsearArchivoResumen(file, {
        reglasFirestore: reglas,
        categorias,
        subcategorias,
        tarjetas,
        movimientosExistentes: movimientos,
        responsableDefault
      });

      setParsedData(res);
      setItems(res.items);
      if (res.responsableDetectado) {
        setResponsableDefault(res.responsableDetectado);
      } else if (res.origen?.includes('Bancor') || res.origen?.includes('Cordobesa')) {
        setResponsableDefault('Cecilia');
      }
      setStep(2);
    } catch (err) {
      console.error('Error parseando archivo:', err);
      setErrorMsg(err.message || 'Error al procesar el archivo.');
    } finally {
      setLoadingParse(false);
    }
  };

  // Actualizar un ítem en la tabla de preview
  const handleUpdateItem = (idTemp, updates) => {
    setItems(prev => prev.map(it => {
      if (it.idTemp !== idTemp) return it;
      const updated = { ...it, ...updates };

      // Si cambia de categoría, resetear o buscar primera subcategoría
      if (updates.categoriaId && updates.categoriaId !== it.categoriaId) {
        const subsDisponibles = subcategorias.filter(s => s.categoriaId === updates.categoriaId);
        updated.subcategoriaId = subsDisponibles[0]?.id || '';
      }

      return updated;
    }));
  };

  // Seleccionar / Deseleccionar todos
  const handleToggleTodos = (seleccionar) => {
    setItems(prev => prev.map(it => ({
      ...it,
      seleccionado: seleccionar && !it.esDuplicado
    })));
  };

  // Guardar e importar en Firestore
  const handleConfirmarImportacion = async () => {
    const seleccionados = items.filter(it => it.seleccionado);

    if (seleccionados.length === 0) {
      alert('No hay movimientos seleccionados para importar.');
      return;
    }

    setSavingBatch(true);
    try {
      // Reglas a guardar en Firestore
      const nuevasReglas = seleccionados
        .filter(it => it.guardarRegla && it.categoriaId)
        .map(it => ({
          patron: it.descripcion,
          categoriaId: it.categoriaId,
          subcategoriaId: it.subcategoriaId || ''
        }));

      await importarMovimientosBatch(seleccionados, nuevasReglas);
      setStep(3);
    } catch (err) {
      console.error('Error al guardar en lote:', err);
      alert('Error al guardar los movimientos: ' + err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  // Cerrar y reiniciar modal
  const handleClose = () => {
    setStep(1);
    setFile(null);
    setParsedData(null);
    setItems([]);
    setErrorMsg('');
    onClose();
  };

  // Métricas calculadas para la vista previa
  const metrics = useMemo(() => {
    const total = items.length;
    const computables = items.filter(i => i.contabiliza !== false);
    const totalGastos = computables.filter(i => i.tipo === 'egreso').reduce((acc, i) => acc + (i.monto || 0), 0);
    const totalIngresos = computables.filter(i => i.tipo === 'ingreso').reduce((acc, i) => acc + (i.monto || 0), 0);
    const noComputan = items.filter(i => i.contabiliza === false);
    const sinCategoria = computables.filter(i => !i.categoriaId);
    const listos = items.filter(i => i.seleccionado);

    return {
      total,
      totalGastos,
      totalIngresos,
      noComputanCount: noComputan.length,
      sinCategoriaCount: sinCategoria.length,
      seleccionadosCount: listos.length
    };
  }, [items]);

  // Ítems filtrados para la tabla
  const itemsFiltrados = useMemo(() => {
    return items.filter(it => {
      // Filtro de texto
      if (filtroTexto) {
        const textLower = filtroTexto.toLowerCase();
        const matchDesc = (it.descripcion || '').toLowerCase().includes(textLower);
        const matchComentario = (it.comentario || '').toLowerCase().includes(textLower);
        const matchMonto = (it.monto || '').toString().includes(textLower);
        if (!matchDesc && !matchMonto && !matchComentario) return false;
      }

      // Filtro de estado
      if (filtroEstado === 'sin_categoria') {
        return it.contabiliza !== false && !it.categoriaId;
      }
      if (filtroEstado === 'computables') {
        return it.contabiliza !== false;
      }
      if (filtroEstado === 'no_computan') {
        return it.contabiliza === false;
      }

      return true;
    });
  }, [items, filtroTexto, filtroEstado]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Importador Inteligente de Resúmenes"
      maxWidth="max-w-6xl"
    >
      {/* Paso 1: Carga del Archivo */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Carga automática de extractos y resúmenes
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Subí el archivo exportado de tu banco o billetera virtual. GesHogar clasificará automáticamente los gastos, detectará transferencias internas y excluirá pagos duplicados de tarjetas de crédito.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-slate-200/80">
              <span className="text-xs bg-blue-100 text-blue-800 font-medium px-2.5 py-1 rounded-full">🔷 Mercado Pago (.csv / .pdf)</span>
              <span className="text-xs bg-red-100 text-red-800 font-medium px-2.5 py-1 rounded-full">🔴 Banco Santander (.xlsx)</span>
              <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2.5 py-1 rounded-full">🏛️ Bancor (.xls / .xlsx)</span>
              <span className="text-xs bg-sky-100 text-sky-800 font-medium px-2.5 py-1 rounded-full">💳 Tarjeta Cordobesa (.pdf)</span>
              <span className="text-xs bg-orange-100 text-orange-800 font-medium px-2.5 py-1 rounded-full">🟠 Naranja X (.pdf)</span>
            </div>
          </div>

          {/* Selector de archivo / Drag and drop */}
          <div className="border-2 border-dashed border-slate-300 hover:border-primary/70 rounded-xl p-8 text-center transition-colors bg-card">
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls,.txt,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-slate-800">
                {file ? file.name : 'Haz clic para seleccionar o arrastra el archivo aquí'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos compatibles: .CSV (Mercado Pago), .XLSX / .XLS (Santander, Bancor, Tarjetas) o .PDF (Mercado Pago, Cordobesa, Naranja X)
              </p>
            </label>
          </div>

          {/* Configuración rápida: Responsable */}
          <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-slate-800">Responsable asignado por defecto:</p>
              <p className="text-xs text-muted-foreground">Podrás ajustarlo de forma individual en la vista previa si lo deseas.</p>
            </div>
            <select
              className="p-2 border rounded-md bg-background text-sm font-medium"
              value={responsableDefault}
              onChange={(e) => setResponsableDefault(e.target.value)}
            >
              {responsablesDisponibles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 text-sm rounded-md bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              disabled={!file || loadingParse} 
              onClick={handleProcesarArchivo}
              className="flex items-center gap-2"
            >
              {loadingParse ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Procesando archivo...
                </>
              ) : (
                <>
                  Continuar a Vista Previa <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Paso 2: Vista Previa y Clasificación */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Header de la entidad detectada */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900 text-white rounded-lg">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Origen detectado</span>
              <h3 className="text-lg font-bold flex items-center gap-2">
                {parsedData?.origenDetectado}
                <span className="text-xs font-normal text-slate-300">({parsedData?.nombreArchivo})</span>
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span>{metrics.total} transacciones leídas</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{metrics.seleccionadosCount} seleccionadas</span>
            </div>
          </div>

          {/* Tarjetas de Resumen KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-rose-50/60 border-rose-200">
              <p className="text-xs font-bold text-rose-700 uppercase">Gastos Computables</p>
              <p className="text-xl font-black text-rose-600 mt-0.5">
                ${metrics.totalGastos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-emerald-50/60 border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 uppercase">Ingresos Computables</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">
                ${metrics.totalIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-slate-100 border-slate-300">
              <p className="text-xs font-bold text-slate-700 uppercase">Movimientos Internos</p>
              <p className="text-xl font-black text-slate-700 mt-0.5">
                {metrics.noComputanCount} <span className="text-xs font-normal text-muted-foreground">(no computan)</span>
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${metrics.sinCategoriaCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-200'}`}>
              <p className="text-xs font-bold uppercase text-slate-700">Sin Categoría</p>
              <p className={`text-xl font-black mt-0.5 ${metrics.sinCategoriaCount > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                {metrics.sinCategoriaCount === 0 ? '0 (Todo clasificado)' : `${metrics.sinCategoriaCount} pendientes`}
              </p>
            </div>
          </div>

          {/* Barra de herramientas y filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Filtrar por comercio o monto..."
                className="p-1.5 text-xs border rounded-md bg-background w-56"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
              <select
                className="p-1.5 text-xs border rounded-md bg-background"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todos">Todos los movimientos ({items.length})</option>
                <option value="sin_categoria">Requieren atención / Sin categoría ({metrics.sinCategoriaCount})</option>
                <option value="computables">Solo computables ({metrics.total - metrics.noComputanCount})</option>
                <option value="no_computan">Transferencias internas / No computan ({metrics.noComputanCount})</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleToggleTodos(true)}>
                Seleccionar todos
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleToggleTodos(false)}>
                Deseleccionar todos
              </Button>
            </div>
          </div>

          {/* Tabla de previsualización */}
          <div className="border rounded-lg overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 border-b">
                <tr>
                  <th className="p-2.5 w-8 text-center">✓</th>
                  <th className="p-2.5 w-24">Fecha</th>
                  <th className="p-2.5 min-w-[220px]">Concepto y Aclaración</th>
                  <th className="p-2.5 w-28 text-right">Monto</th>
                  <th className="p-2.5 w-32">Naturaleza</th>
                  <th className="p-2.5 min-w-[150px]">Categoría</th>
                  <th className="p-2.5 min-w-[150px]">Subcategoría</th>
                  <th className="p-2.5 w-24">Resp.</th>
                  <th className="p-2.5 w-28 text-center">Recordar regla</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      No hay transacciones que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  itemsFiltrados.map((it) => {
                    const subsDeCat = subcategorias.filter(s => s.categoriaId === it.categoriaId);
                    const esNoComputable = it.contabiliza === false;

                    return (
                      <tr 
                        key={it.idTemp} 
                        className={`hover:bg-slate-50/80 transition-colors ${!it.seleccionado ? 'opacity-40 bg-slate-50/40' : ''}`}
                      >
                        {/* Checkbox de importación */}
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={it.seleccionado}
                            disabled={it.esDuplicado}
                            onChange={(e) => handleUpdateItem(it.idTemp, { seleccionado: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                        </td>

                        {/* Fecha */}
                        <td className="p-2 font-mono whitespace-nowrap text-slate-600">
                          {it.fecha.split('-').reverse().join('/')}
                        </td>

                        {/* Concepto y Aclaración */}
                        <td className="p-2 min-w-[220px]">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-slate-800 line-clamp-1 text-xs" title={it.descripcion}>
                              {it.descripcion}
                            </p>
                            {it.refId && (
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">Ref: {it.refId}</span>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Aclaración / Comentario opcional..."
                            value={it.comentario || ''}
                            onChange={(e) => handleUpdateItem(it.idTemp, { comentario: e.target.value })}
                            className="w-full text-xs px-2 py-1 mt-1 border border-slate-200 rounded bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                          />
                        </td>

                        {/* Monto */}
                        <td className="p-2 text-right whitespace-nowrap">
                          <span className={`font-black text-sm ${it.tipo === 'egreso' ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {it.tipo === 'egreso' ? '-' : '+'}${Number(it.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {it.montoOriginalUsd && (
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              (U$S {it.montoOriginalUsd})
                            </span>
                          )}
                        </td>

                        {/* Naturaleza / Badge */}
                        <td className="p-2">
                          {esNoComputable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                              <ShieldCheck className="h-3 w-3" /> {it.etiquetaEspecial || 'No computa'}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${it.tipo === 'egreso' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {it.tipo === 'egreso' ? 'Gasto Real' : 'Ingreso Real'}
                            </span>
                          )}
                          {it.esDuplicado && (
                            <span className="block text-[10px] font-bold text-amber-600 mt-0.5">⚠️ Ya existe</span>
                          )}
                          {it.alertaImportacion && (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 mt-1 cursor-help max-w-xs" 
                              title={it.alertaImportacion}
                            >
                              ⚠️ {it.alertaImportacion}
                            </span>
                          )}
                        </td>

                        {/* Categoría */}
                        <td className="p-2">
                          {esNoComputable ? (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          ) : (
                            <select
                              className={`w-full p-1 border rounded text-xs bg-background ${!it.categoriaId ? 'border-amber-400 bg-amber-50/30' : ''}`}
                              value={it.categoriaId || ''}
                              onChange={(e) => handleUpdateItem(it.idTemp, { categoriaId: e.target.value })}
                            >
                              <option value="">Seleccionar Categoría...</option>
                              {categorias
                                .filter(c => c.tipo === it.tipo)
                                .map(c => (
                                  <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))
                              }
                            </select>
                          )}
                        </td>

                        {/* Subcategoría */}
                        <td className="p-2">
                          {esNoComputable || !it.categoriaId ? (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          ) : (
                            <select
                              className="w-full p-1 border rounded text-xs bg-background"
                              value={it.subcategoriaId || ''}
                              onChange={(e) => handleUpdateItem(it.idTemp, { subcategoriaId: e.target.value })}
                            >
                              <option value="">Sin Subcategoría</option>
                              {subsDeCat.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Responsable */}
                        <td className="p-2">
                          <select
                            className="w-full p-1 border rounded text-xs bg-background"
                            value={it.responsable || responsableDefault}
                            onChange={(e) => handleUpdateItem(it.idTemp, { responsable: e.target.value })}
                          >
                            {responsablesDisponibles.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>

                        {/* Recordar regla */}
                        <td className="p-2 text-center">
                          {!esNoComputable && it.categoriaId && it.origenRegla !== 'predeterminada' && (
                            <label className="inline-flex items-center gap-1 cursor-pointer" title="Guardar para clasificar automáticamente este comercio en el futuro">
                              <input
                                type="checkbox"
                                checked={it.guardarRegla || false}
                                onChange={(e) => handleUpdateItem(it.idTemp, { guardarRegla: e.target.checked })}
                                className="rounded border-slate-300"
                              />
                              <span className="text-[10px] text-indigo-700 font-medium">Recordar</span>
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Botones de acción inferiores */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              ← Elegir otro archivo
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                disabled={metrics.seleccionadosCount === 0 || savingBatch}
                onClick={handleConfirmarImportacion}
                className="bg-primary hover:bg-primary/90 font-bold flex items-center gap-2"
              >
                {savingBatch ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Guardando en GesHogar...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Importar {metrics.seleccionadosCount} movimientos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Éxito */}
      {step === 3 && (
        <div className="text-center py-8 space-y-4">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800">¡Importación Exitosa!</h3>
          <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
            Se registraron correctamente los movimientos seleccionados en GesHogar. Tu Dashboard y Comparativo ya están actualizados con los datos reales.
          </p>
          <div className="pt-4">
            <Button onClick={handleClose} className="px-6">
              Ver Movimientos
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ImportadorModal;
