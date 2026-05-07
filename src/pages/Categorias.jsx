import React, { useState } from 'react';
import { Plus, Edit, Trash2, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';

const Categorias = () => {
  const { 
    categorias, addCategoria, updateCategoria, deleteCategoria,
    subcategorias, addSubcategoria, updateSubcategoria, deleteSubcategoria
  } = useData();

  // Estados para Categorías
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catFormData, setCatFormData] = useState({
    nombre: '', tipo: 'egreso', color: '#3b82f6', icono: '', activa: true
  });

  // Estados para Subcategorías
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState(null);
  const [subFormData, setSubFormData] = useState({
    nombre: '', categoriaId: '', activa: true
  });

  // Handlers Categorías
  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (editingCatId) {
      await updateCategoria(editingCatId, catFormData);
    } else {
      await addCategoria(catFormData);
    }
    closeCatModal();
  };

  const handleCatEdit = (cat) => {
    setEditingCatId(cat.id);
    setCatFormData({ ...cat });
    setIsCatModalOpen(true);
  };

  const closeCatModal = () => {
    setIsCatModalOpen(false);
    setEditingCatId(null);
    setCatFormData({ nombre: '', tipo: 'egreso', color: '#3b82f6', icono: '', activa: true });
  };

  // Handlers Subcategorías
  const handleSubSubmit = async (e) => {
    e.preventDefault();
    if (editingSubId) {
      await updateSubcategoria(editingSubId, subFormData);
    } else {
      await addSubcategoria(subFormData);
    }
    closeSubModal();
  };

  const handleSubEdit = (sub) => {
    setEditingSubId(sub.id);
    setSubFormData({ ...sub });
    setIsSubModalOpen(true);
  };

  const closeSubModal = () => {
    setIsSubModalOpen(false);
    setEditingSubId(null);
    setSubFormData({ nombre: '', categoriaId: '', activa: true });
  };

  return (
    <div className="space-y-10 pb-10">
      {/* SECCIÓN CATEGORÍAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Categorías Principales</h2>
            <p className="text-muted-foreground text-sm">Grupos generales de ingresos y gastos.</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setIsCatModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva Categoría
          </Button>
        </div>

        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 w-12 text-[11px] uppercase tracking-wider">Icono</th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Nombre</th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Tipo</th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Estado</th>
                    <th className="h-12 px-4 text-right align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((cat) => (
                    <tr key={cat.id} className="border-b transition-colors hover:bg-slate-50 group">
                      <td className="p-4 align-middle">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm border bg-white"
                          style={{ borderColor: cat.color }}
                        >
                          {cat.icono || '📁'}
                        </div>
                      </td>
                      <td className="p-4 align-middle font-bold text-base text-slate-900">
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
                          "text-xs font-bold",
                          cat.activa ? "text-emerald-600" : "text-slate-400"
                        )}>
                          {cat.activa ? '● Activa' : '○ Inactiva'}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => handleCatEdit(cat)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => deleteCategoria(cat.id)}>
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
      </section>

      {/* SECCIÓN SUBCATEGORÍAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Subcategorías</h2>
            <p className="text-muted-foreground text-sm">Detalle específico dentro de cada categoría.</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5" onClick={() => setIsSubModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva Subcategoría
          </Button>
        </div>

        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Nombre</th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Pertenece a</th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Estado</th>
                    <th className="h-12 px-4 text-right align-middle font-bold text-slate-500 text-[11px] uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategorias.map((sub) => {
                    const parent = categorias.find(c => c.id === sub.categoriaId);
                    return (
                      <tr key={sub.id} className="border-b transition-colors hover:bg-slate-50 group">
                        <td className="p-4 align-middle font-bold text-slate-900">
                          {sub.nombre}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{parent?.icono || '📁'}</span>
                            <span className="font-medium text-slate-600">{parent?.nombre || 'Sin categoría'}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <span className={cn(
                            "text-xs font-bold",
                            sub.activa ? "text-emerald-600" : "text-slate-400"
                          )}>
                            {sub.activa ? '● Activa' : '○ Inactiva'}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" onClick={() => handleSubEdit(sub)} className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => deleteSubcategoria(sub.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {subcategorias.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-10 text-center text-slate-400 italic">No has creado subcategorías aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* MODAL CATEGORÍA */}
      <Modal isOpen={isCatModalOpen} onClose={closeCatModal} title={editingCatId ? "Editar Categoría" : "Nueva Categoría"}>
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de Categoría</label>
            <input type="text" className="w-full p-2 border rounded-md bg-background" required value={catFormData.nombre} onChange={(e) => setCatFormData({...catFormData, nombre: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select className="w-full p-2 border rounded-md bg-background" value={catFormData.tipo} onChange={(e) => setCatFormData({...catFormData, tipo: e.target.value})}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <input type="color" className="w-full h-10 p-1 border rounded-md bg-background" value={catFormData.color} onChange={(e) => setCatFormData({...catFormData, color: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Icono (Emoji)</label>
            <input type="text" className="w-full p-2 border rounded-md bg-background" placeholder="Ej: 🏠" value={catFormData.icono} onChange={(e) => setCatFormData({...catFormData, icono: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={closeCatModal}>Cancelar</Button>
            <Button type="submit">{editingCatId ? "Guardar" : "Crear"}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL SUBCATEGORÍA */}
      <Modal isOpen={isSubModalOpen} onClose={closeSubModal} title={editingSubId ? "Editar Subcategoría" : "Nueva Subcategoría"}>
        <form onSubmit={handleSubSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de Subcategoría</label>
            <input type="text" className="w-full p-2 border rounded-md bg-background" required value={subFormData.nombre} onChange={(e) => setSubFormData({...subFormData, nombre: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría Principal</label>
            <select className="w-full p-2 border rounded-md bg-background" required value={subFormData.categoriaId} onChange={(e) => setSubFormData({...subFormData, categoriaId: e.target.value})}>
              <option value="">Seleccionar categoría...</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icono} {cat.nombre} ({cat.tipo})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={closeSubModal}>Cancelar</Button>
            <Button type="submit">{editingSubId ? "Guardar" : "Crear"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categorias;
