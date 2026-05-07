import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';

const Categorias = () => {
  const { categorias, addCategoria, updateCategoria, deleteCategoria } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'egreso',
    color: '#3b82f6',
    icono: '',
    activa: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateCategoria(editingId, formData);
    } else {
      await addCategoria(formData);
    }
    closeModal();
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({
      nombre: cat.nombre,
      tipo: cat.tipo,
      color: cat.color,
      icono: cat.icono,
      activa: cat.activa
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      await deleteCategoria(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ nombre: '', tipo: 'egreso', color: '#3b82f6', icono: '', activa: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Categorías</h2>
        <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">Icono</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => (
                  <tr key={cat.id} className="border-b transition-colors hover:bg-muted/50 group">
                    <td className="p-4 align-middle">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm border"
                        style={{ backgroundColor: cat.color + '20', borderColor: cat.color }}
                      >
                        {cat.icono || '📁'}
                      </div>
                    </td>
                    <td className="p-4 align-middle font-bold text-base">
                      {cat.nombre}
                    </td>
                    <td className="p-4 align-middle">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
                        cat.tipo === 'ingreso' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      )}>
                        {cat.tipo}
                      </span>
                    </td>
                    <td className="p-4 align-middle">
                      <span className={cn(
                        "text-xs font-medium",
                        cat.activa ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        {cat.activa ? '● Activa' : '○ Inactiva'}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDelete(cat.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
        title={editingId ? "Editar Categoría" : "Nueva Categoría"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md bg-background" 
              required
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select 
                className="w-full p-2 border rounded-md bg-background"
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <input 
                type="color" 
                className="w-full h-10 p-1 border rounded-md bg-background" 
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Icono (Emoji)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md bg-background" 
              placeholder="Ej: 🛒"
              value={formData.icono}
              onChange={(e) => setFormData({...formData, icono: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={closeModal}>Cancelar</Button>
            <Button type="submit">
              {editingId ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categorias;
