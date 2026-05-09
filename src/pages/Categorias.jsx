import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, ArrowUpDown } from 'lucide-react';
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos'); // 'todos', 'ingreso', 'egreso'
  const [sortBy, setSortBy] = useState('nombre'); // 'nombre', 'tipo'

  // Estados Modales
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [catFormData, setCatFormData] = useState({
    nombre: '', tipo: 'egreso', color: '#3b82f6', icono: '', activa: true
  });

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

  const openSubModalForCat = (catId) => {
    setSubFormData({ nombre: '', categoriaId: catId, activa: true });
    setIsSubModalOpen(true);
  };

  // Filtrado y Ordenamiento
  const filteredData = useMemo(() => {
    // 1. Enlazar subcategorías a cada categoría
    let result = categorias.map(cat => {
      const subs = subcategorias.filter(s => s.categoriaId === cat.id);
      return { ...cat, subs };
    });

    // 2. Filtrar por Tipo
    if (filterTipo !== 'todos') {
      result = result.filter(c => c.tipo === filterTipo);
    }

    // 3. Filtrar por Búsqueda (Texto)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(c => {
        const matchCat = c.nombre.toLowerCase().includes(search);
        const matchSub = c.subs.some(s => s.nombre.toLowerCase().includes(search));
        
        if (matchSub && !matchCat) {
          // Si matcheó una subcategoría pero no la categoría padre, filtramos las subcategorías
          // para mostrar solo las que coinciden.
          c.subs = c.subs.filter(s => s.nombre.toLowerCase().includes(search));
        }
        return matchCat || matchSub;
      });
    }

    // 4. Ordenamiento
    result.sort((a, b) => {
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (sortBy === 'tipo') {
        if (a.tipo === b.tipo) return a.nombre.localeCompare(b.nombre);
        return a.tipo.localeCompare(b.tipo);
      }
      return 0;
    });

    // 5. Ordenar subcategorías alfabéticamente
    result.forEach(c => c.subs.sort((a, b) => a.nombre.localeCompare(b.nombre)));

    return result;
  }, [categorias, subcategorias, searchTerm, filterTipo, sortBy]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Categorías y Subcategorías</h2>
          <p className="text-muted-foreground text-sm">Gestiona la estructura jerárquica de tus presupuestos.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="flex items-center gap-2 border-primary text-primary hover:bg-primary/5" onClick={() => setIsSubModalOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva Subcategoría
          </Button>
          <Button className="flex items-center gap-2" onClick={() => setIsCatModalOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva Categoría
          </Button>
        </div>
      </div>

      {/* Buscador y Controles */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar categoría o subcategoría..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-background shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="flex-1 sm:flex-none p-2 border rounded-md bg-background text-sm shadow-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="todos">Todos los Tipos</option>
            <option value="ingreso">Solo Ingresos</option>
            <option value="egreso">Solo Egresos</option>
          </select>
          <select 
            className="flex-1 sm:flex-none p-2 border rounded-md bg-background text-sm shadow-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="nombre">Orden Alfabético</option>
            <option value="tipo">Orden por Tipo</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredData.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground italic bg-slate-50 rounded-xl border border-dashed flex flex-col items-center justify-center">
            <Search className="h-8 w-8 mb-2 opacity-20" />
            No se encontraron categorías o subcategorías.
          </div>
        ) : (
          filteredData.map(cat => (
            <Card key={cat.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50/80 border-b pb-3 pt-4 px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm bg-white"
                      style={{ borderBottom: `3px solid ${cat.color || '#cbd5e1'}` }}
                    >
                      {cat.icono || '📁'}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{cat.nombre}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider",
                          cat.tipo === 'ingreso' 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {cat.tipo}
                        </span>
                        {!cat.activa && (
                          <span className="text-[10px] font-bold uppercase text-rose-400">
                            Inactiva
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium text-xs px-2 hidden sm:flex" onClick={() => openSubModalForCat(cat.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Añadir Subcategoría
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600 sm:hidden" onClick={() => openSubModalForCat(cat.id)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500" onClick={() => handleCatEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50" onClick={() => deleteCategoria(cat.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {cat.subs.length === 0 ? (
                  <div className="p-4 pl-6 text-sm text-slate-400 italic">
                    Sin subcategorías asociadas. Usa el botón "+" para agregar una.
                  </div>
                ) : (
                  <div className="w-full overflow-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {cat.subs.map((sub, idx) => (
                          <tr key={sub.id} className={cn(
                            "group transition-colors hover:bg-slate-50",
                            idx < cat.subs.length - 1 ? "border-b border-slate-100/50" : ""
                          )}>
                            <td className="p-3 pl-8 align-middle font-semibold text-slate-700 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                              {sub.nombre}
                              {!sub.activa && <span className="text-[10px] font-bold text-rose-400 ml-2">(Inactiva)</span>}
                            </td>
                            <td className="p-3 pr-6 align-middle text-right w-24">
                              <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500" onClick={() => handleSubEdit(sub)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50" onClick={() => deleteSubcategoria(sub.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
              <label className="text-sm font-medium">Color (Borde inferior)</label>
              <input type="color" className="w-full h-10 p-1 border rounded-md bg-background cursor-pointer" value={catFormData.color} onChange={(e) => setCatFormData({...catFormData, color: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Icono (Emoji)</label>
            <input type="text" className="w-full p-2 border rounded-md bg-background" placeholder="Ej: 🏠" value={catFormData.icono} onChange={(e) => setCatFormData({...catFormData, icono: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={closeCatModal}>Cancelar</Button>
            <Button type="submit">{editingCatId ? "Guardar Cambios" : "Crear Categoría"}</Button>
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
            <Button type="submit">{editingSubId ? "Guardar Cambios" : "Crear Subcategoría"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categorias;
