import React, { useState } from 'react';
import { Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';

const Movimientos = () => {
  const { movimientos, categorias, subcategorias, tarjetas, addMovimiento, updateMovimiento, deleteMovimiento, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'egreso',
    categoriaId: '',
    subcategoriaId: '',
    descripcion: '',
    monto: '',
    responsable: '',
    estado: 'pagado',
    medioPago: 'Efectivo',
    tarjeta: '',
    cantidadCuotas: '1',
    fechaPrimeraCuota: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    recurrente: false,
    esCuota: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.categoriaId || !formData.subcategoriaId) {
      alert('Debes seleccionar una Categoría y una Subcategoría.');
      return;
    }

    const totalCuotas = Number(formData.cantidadCuotas || 1);

    // Lógica para registrar nueva compra financiada o en 1 cuota con Tarjeta
    if (!editingId && formData.medioPago === 'Tarjeta' && formData.tipo === 'egreso') {
      try {
        const dataOriginal = {
          fecha: formData.fecha,
          tipo: 'egreso',
          categoriaId: formData.categoriaId,
          subcategoriaId: formData.subcategoriaId,
          descripcion: formData.descripcion,
          monto: Number(formData.monto),
          responsable: formData.responsable || '',
          estado: 'pendiente',
          medioPago: 'Tarjeta',
          tarjeta: formData.tarjeta,
          cantidadCuotas: totalCuotas,
          fechaPrimeraCuota: formData.fechaPrimeraCuota,
          esCuota: false,
          contabiliza: false, // Compra de referencia no contabiliza
          mes: formData.fecha.substring(0, 7)
        };

        const originalDoc = await addMovimiento(dataOriginal);
        const originalId = originalDoc.id;

        // Actualizar el origen con su compraId
        await updateMovimiento(originalId, { compraId: originalId });

        // Generar cuotas individuales
        const promesas = [];
        const cuotaMonto = Number((Number(formData.monto) / totalCuotas).toFixed(2));

        for (let i = 1; i <= totalCuotas; i++) {
          const baseDate = new Date(formData.fechaPrimeraCuota + 'T00:00:00');
          baseDate.setMonth(baseDate.getMonth() + (i - 1));
          const cuotaFecha = baseDate.toISOString().split('T')[0];
          const cuotaMes = cuotaFecha.substring(0, 7);

          promesas.push(addMovimiento({
            tipo: 'egreso',
            categoriaId: formData.categoriaId,
            subcategoriaId: formData.subcategoriaId,
            responsable: formData.responsable || '',
            descripcion: totalCuotas > 1 ? `${formData.descripcion} (Cuota ${i}/${totalCuotas})` : `${formData.descripcion} (Cuota única)`,
            monto: cuotaMonto,
            fecha: cuotaFecha,
            mes: cuotaMes,
            estado: 'pendiente',
            medioPago: 'Tarjeta',
            tarjeta: formData.tarjeta,
            esCuota: true,
            numeroCuota: i,
            cantidadCuotas: totalCuotas,
            movimientoOrigenId: originalId,
            compraId: originalId,
            contabiliza: true // Las cuotas sí contabilizan
          }));
        }

        await Promise.all(promesas);
        alert(`Se guardó la compra con tarjeta y se generaron las cuotas correspondientes.`);
      } catch (error) {
        console.error("Error al registrar compra con tarjeta:", error);
        alert("Error al registrar la compra con tarjeta.");
      }
    } else {
      // Guardado o edición tradicional
      const data = {
        fecha: formData.fecha,
        tipo: formData.tipo,
        categoriaId: formData.categoriaId,
        subcategoriaId: formData.subcategoriaId,
        descripcion: formData.descripcion,
        monto: Number(formData.monto),
        responsable: formData.responsable || '',
        estado: formData.estado,
        medioPago: formData.medioPago || 'Efectivo',
        tarjeta: formData.medioPago === 'Tarjeta' ? formData.tarjeta : '',
        cantidadCuotas: formData.medioPago === 'Tarjeta' ? totalCuotas : 1,
        fechaPrimeraCuota: formData.medioPago === 'Tarjeta' ? formData.fechaPrimeraCuota : '',
        recurrente: formData.tipo === 'egreso' ? (formData.recurrente || false) : false,
        esCuota: formData.esCuota || false,
        contabiliza: formData.esCuota === false && formData.medioPago === 'Tarjeta' ? false : (formData.contabiliza !== undefined ? formData.contabiliza : true),
        mes: formData.fecha.substring(0, 7)
      };

      if (editingId) {
        await updateMovimiento(editingId, data);
      } else {
        await addMovimiento(data);
      }
    }
    closeModal();
  };

  const handleEdit = (m) => {
    setEditingId(m.id);
    setFormData({
      fecha: m.fecha,
      tipo: m.tipo,
      categoriaId: m.categoriaId || '',
      subcategoriaId: m.subcategoriaId || '',
      descripcion: m.descripcion || '',
      monto: m.monto,
      responsable: m.responsable || '',
      estado: m.estado,
      medioPago: m.medioPago || 'Efectivo',
      tarjeta: m.tarjeta || '',
      cantidadCuotas: m.cantidadCuotas?.toString() || '1',
      fechaPrimeraCuota: m.fechaPrimeraCuota || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      recurrente: m.recurrente || false,
      esCuota: m.esCuota || false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const mov = movimientos.find(m => m.id === id);
    if (!mov) return;

    if (mov.compraId) {
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
      monto: '',
      responsable: '',
      estado: 'pagado',
      medioPago: 'Efectivo',
      tarjeta: '',
      cantidadCuotas: '1',
      fechaPrimeraCuota: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      recurrente: false,
      esCuota: false
    });
  };

  const filteredMovimientos = movimientos.filter(m => {
    if (mes && !m.fecha.startsWith(mes)) return false;

    const search = searchTerm.toLowerCase();
    const categoriaNombre = categorias.find(c => c.id === m.categoriaId)?.nombre || '';
    const subcategoriaNombre = subcategorias.find(s => s.id === m.subcategoriaId)?.nombre || '';
    
    return (
      (m.descripcion || '').toLowerCase().includes(search) ||
      categoriaNombre.toLowerCase().includes(search) ||
      subcategoriaNombre.toLowerCase().includes(search) ||
      (m.responsable || '').toLowerCase().includes(search) ||
      (m.tipo || '').toLowerCase().includes(search) ||
      (m.estado || '').toLowerCase().includes(search)
    );
  });

  const totalIngresos = filteredMovimientos.filter(m => m.tipo === 'ingreso').reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  const totalEgresos = filteredMovimientos.filter(m => m.tipo === 'egreso' && m.contabiliza !== false).reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  const saldo = totalIngresos - totalEgresos;

  if (loading) return <div className="flex items-center justify-center h-full">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Movimientos</h2>
        <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Movimiento
        </Button>
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
                  <th className="h-12 px-4 text-right align-middle text-muted-foreground">Monto</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Estado</th>
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
                        {m.medioPago && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold w-max uppercase tracking-wider">
                            {m.medioPago}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle whitespace-nowrap">
                      {categorias.find(c => c.id === m.categoriaId)?.icono} {categorias.find(c => c.id === m.categoriaId)?.nombre || 'Sin categoría'}
                    </td>
                    <td className="p-4 align-middle">
                      {subcategorias.find(s => s.id === m.subcategoriaId)?.nombre || '-'}
                    </td>
                    <td className="p-4 align-middle max-w-[200px] truncate" title={m.descripcion}>
                      <div className="flex flex-col gap-0.5">
                        <span className={cn("font-medium", m.contabiliza === false ? "font-normal text-slate-400" : "")}>
                          {m.descripcion}
                        </span>
                        {m.tarjeta && (
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide">
                            💳 {m.tarjeta}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle font-medium">{m.responsable || 'Sin asignar'}</td>
                    <td className="p-4 align-middle text-right font-medium">
                      {m.contabiliza === false ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-slate-400 font-normal">
                            ${(Number(m.monto) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1 py-0.5 rounded mt-0.5 uppercase tracking-wider">
                            Informativo
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
        title={editingId ? "Editar Movimiento" : "Nuevo Movimiento"}
      >
        <form onSubmit={handleSubmit}>
          {/* Layout de 2 columnas: izquierda campos base, derecha tarjeta (si aplica) */}
          <div className={cn("gap-6", formData.medioPago === 'Tarjeta' && formData.tipo === 'egreso' && !formData.esCuota ? "grid grid-cols-2" : "flex flex-col gap-4")}>

            {/* ─── Columna Izquierda / Campos Base ─── */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Fecha</label>
                  <input type="date" className="w-full p-2 border rounded-md bg-background text-sm" required value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tipo</label>
                  <select className="w-full p-2 border rounded-md bg-background text-sm" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Categoría</label>
                <select 
                  className="w-full p-2 border rounded-md bg-background text-sm" 
                  required 
                  value={formData.categoriaId} 
                  onChange={(e) => setFormData({...formData, categoriaId: e.target.value})}
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
                <label className="text-sm font-medium">Subcategoría</label>
                <select 
                  className="w-full p-2 border rounded-md bg-background text-sm" 
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descripción</label>
                <input type="text" className="w-full p-2 border rounded-md bg-background text-sm" required value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Monto</label>
                  <input type="number" className="w-full p-2 border rounded-md bg-background text-sm" required value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Responsable</label>
                  <select 
                    className="w-full p-2 border rounded-md bg-background text-sm" 
                    value={formData.responsable} 
                    onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                  >
                    <option value="">Sin asignar</option>
                    <option value="Andres">Andres</option>
                    <option value="Cecilia">Cecilia</option>
                    <option value="Agustin">Agustin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Medio de Pago</label>
                  <select 
                    className="w-full p-2 border rounded-md bg-background text-sm" 
                    required
                    disabled={editingId && formData.esCuota}
                    value={formData.medioPago || 'Efectivo'} 
                    onChange={(e) => {
                      const mp = e.target.value;
                      // Si se elige Tarjeta, forzar estado pendiente automáticamente
                      setFormData({
                        ...formData,
                        medioPago: mp,
                        tarjeta: '',
                        cantidadCuotas: '1',
                        estado: mp === 'Tarjeta' ? 'pendiente' : formData.estado
                      });
                    }}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Débito">Débito</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Billetera virtual">Billetera virtual</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Estado
                    {formData.medioPago === 'Tarjeta' && (
                      <span className="ml-1.5 text-[10px] text-amber-600 font-bold uppercase tracking-wide bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Auto
                      </span>
                    )}
                  </label>
                  <select 
                    className={cn("w-full p-2 border rounded-md bg-background text-sm", formData.medioPago === 'Tarjeta' ? "text-amber-700 font-semibold border-amber-300 bg-amber-50/30" : "")}
                    value={formData.estado} 
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  >
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="proyectado">Proyectado</option>
                  </select>
                </div>
              </div>


              {editingId && formData.esCuota && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 font-medium">
                  ⚠️ Estás editando una cuota individual. Para cambiar la financiación completa, elimina esta compra y vuelve a cargarla.
                </div>
              )}
            </div>

            {/* ─── Columna Derecha / Detalles de Tarjeta ─── */}
            {formData.medioPago === 'Tarjeta' && formData.tipo === 'egreso' && !formData.esCuota && (
              <div className="flex flex-col gap-3 p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  💳 Detalles de Tarjeta
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nombre de la Tarjeta</label>
                  <select 
                    className="w-full p-2 border rounded-md bg-background text-sm" 
                    required={formData.medioPago === 'Tarjeta' && !formData.esCuota}
                    value={formData.tarjeta || ''} 
                    onChange={(e) => setFormData({...formData, tarjeta: e.target.value})} 
                  >
                    <option value="">Seleccionar tarjeta...</option>
                    {tarjetas && tarjetas.filter(t => t.activa).map(t => (
                      <option key={t.id} value={t.nombre}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Cantidad de Cuotas</label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="1"
                    className="w-full p-2 border rounded-md bg-background text-sm font-medium" 
                    required={formData.medioPago === 'Tarjeta' && !formData.esCuota}
                    value={formData.cantidadCuotas || '1'} 
                    onChange={(e) => setFormData({...formData, cantidadCuotas: e.target.value})} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Fecha 1er Vencimiento</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded-md bg-background text-sm font-medium" 
                    required={formData.medioPago === 'Tarjeta' && !formData.esCuota}
                    value={formData.fechaPrimeraCuota || ''} 
                    onChange={(e) => setFormData({...formData, fechaPrimeraCuota: e.target.value})} 
                  />
                </div>

                {formData.monto && formData.fechaPrimeraCuota && (
                  <div className="p-2.5 bg-indigo-100/60 rounded-md text-xs text-indigo-900 font-medium leading-relaxed mt-auto">
                    {Number(formData.cantidadCuotas) > 1 ? (
                      <span>💡 Referencia informativa + <span className="font-bold">{formData.cantidadCuotas}</span> cuotas de <span className="font-bold">${(Number(formData.monto) / Number(formData.cantidadCuotas)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> desde <span className="font-bold">{new Date(formData.fechaPrimeraCuota + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>.</span>
                    ) : (
                      <span>💡 Referencia informativa + <span className="font-bold">1 cuota única</span> de <span className="font-bold">${(Number(formData.monto)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> en <span className="font-bold">{new Date(formData.fechaPrimeraCuota + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>.</span>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex justify-end gap-3 pt-5 mt-2 border-t">
            <Button variant="outline" type="button" onClick={closeModal}>Cancelar</Button>
            <Button type="submit">{editingId ? "Guardar Cambios" : "Crear Movimiento"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Movimientos;
