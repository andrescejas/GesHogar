import React, { useState } from 'react';
import { Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';

const Movimientos = () => {
  const { movimientos, categorias, addMovimiento, updateMovimiento, deleteMovimiento, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'egreso',
    categoriaId: '',
    descripcion: '',
    monto: '',
    responsable: '',
    estado: 'pagado'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      monto: Number(formData.monto),
      mes: formData.fecha.substring(0, 7) // Formato YYYY-MM
    };

    if (editingId) {
      await updateMovimiento(editingId, data);
    } else {
      await addMovimiento(data);
    }
    closeModal();
  };

  const handleEdit = (m) => {
    setEditingId(m.id);
    setFormData({
      fecha: m.fecha,
      tipo: m.tipo,
      categoriaId: m.categoriaId || '',
      descripcion: m.descripcion,
      monto: m.monto,
      responsable: m.responsable,
      estado: m.estado
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este movimiento?')) {
      await deleteMovimiento(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'egreso',
      categoriaId: '',
      descripcion: '',
      monto: '',
      responsable: '',
      estado: 'pagado'
    });
  };

  const filteredMovimientos = movimientos.filter(m => 
    m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-full">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Movimientos</h2>
        <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Movimiento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historial de Transacciones</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-9 pr-4 py-2 text-sm border rounded-md bg-background w-[200px] md:w-[300px]"
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
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Descripción</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Responsable</th>
                  <th className="h-12 px-4 text-right align-middle text-muted-foreground">Monto</th>
                  <th className="h-12 px-4 text-left align-middle text-muted-foreground">Estado</th>
                  <th className="h-12 px-4 text-right align-middle text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredMovimientos.map((m) => (
                  <tr key={m.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle whitespace-nowrap">{m.fecha}</td>
                    <td className="p-4 align-middle">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                        m.tipo === 'ingreso' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      {categorias.find(c => c.id === m.categoriaId)?.icono} {categorias.find(c => c.id === m.categoriaId)?.nombre || 'Sin categoría'}
                    </td>
                    <td className="p-4 align-middle">{m.descripcion}</td>
                    <td className="p-4 align-middle">{m.responsable}</td>
                    <td className="p-4 align-middle text-right font-medium">
                      {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 align-middle">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                        m.estado === 'pagado' ? "bg-blue-100 text-blue-800" : 
                        m.estado === 'pendiente' ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields same as before, but using formData and update logic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <input type="date" className="w-full p-2 border rounded-md bg-background" required value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select className="w-full p-2 border rounded-md bg-background" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <select 
              className="w-full p-2 border rounded-md bg-background" 
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <input type="text" className="w-full p-2 border rounded-md bg-background" required value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto</label>
              <input type="number" className="w-full p-2 border rounded-md bg-background" required value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsable</label>
              <input type="text" className="w-full p-2 border rounded-md bg-background" required value={formData.responsable} onChange={(e) => setFormData({...formData, responsable: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <select className="w-full p-2 border rounded-md bg-background" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})}>
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="proyectado">Proyectado</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={closeModal}>Cancelar</Button>
            <Button type="submit">{editingId ? "Guardar Cambios" : "Crear Movimiento"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Movimientos;
