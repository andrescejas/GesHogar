import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, CreditCard } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const Tarjetas = () => {
  const { tarjetas, addTarjeta, updateTarjeta, deleteTarjeta } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  // Estados Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isFixing, setIsFixing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '', activa: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await updateTarjeta(editingId, formData);
    } else {
      await addTarjeta(formData);
    }
    closeModal();
  };

  const handleEdit = (tarjeta) => {
    setEditingId(tarjeta.id);
    setFormData({ ...tarjeta });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarjeta?')) {
      await deleteTarjeta(id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ nombre: '', activa: true });
  };

  const fixTarjetasData = async () => {
    if (!window.confirm('¿Reparar registros antiguos de tarjetas en movimientos y proyecciones?')) return;
    setIsFixing(true);
    try {
      let count = 0;
      // Reparar movimientos
      const movSnap = await getDocs(collection(db, 'movimientos'));
      for (const mDoc of movSnap.docs) {
        const m = mDoc.data();
        if (m.tarjeta && m.tarjeta.length > 0) {
          const exists = tarjetas.some(t => t.id === m.tarjeta);
          if (!exists) {
            const matchedTarjeta = tarjetas.find(t => t.nombre.toLowerCase().trim() === m.tarjeta.toLowerCase().trim());
            if (matchedTarjeta) {
              await updateDoc(doc(db, 'movimientos', mDoc.id), { tarjeta: matchedTarjeta.id });
              count++;
            }
          }
        }
      }
      
      // Reparar proyecciones
      const proySnap = await getDocs(collection(db, 'proyecciones'));
      for (const pDoc of proySnap.docs) {
        const p = pDoc.data();
        if (p.tarjeta && p.tarjeta.length > 0) {
          const exists = tarjetas.some(t => t.id === p.tarjeta);
          if (!exists) {
            const matchedTarjeta = tarjetas.find(t => t.nombre.toLowerCase().trim() === p.tarjeta.toLowerCase().trim());
            if (matchedTarjeta) {
              await updateDoc(doc(db, 'proyecciones', pDoc.id), { tarjeta: matchedTarjeta.id });
              count++;
            }
          }
        }
      }

      alert(`Se han corregido ${count} registros exitosamente.`);
    } catch (error) {
      console.error(error);
      alert('Error al corregir los datos.');
    } finally {
      setIsFixing(false);
    }
  };

  // Filtrado y Ordenamiento
  const filteredData = useMemo(() => {
    let result = [...tarjetas];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(t => t.nombre.toLowerCase().includes(search));
    }

    result.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return result;
  }, [tarjetas, searchTerm]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Tarjetas</h2>
          <p className="text-muted-foreground text-sm">Gestiona tus tarjetas de crédito y débito.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2 text-amber-600 border-amber-200 bg-amber-50" onClick={fixTarjetasData} disabled={isFixing}>
            {isFixing ? 'Reparando...' : 'Reparar Datos'}
          </Button>
          <Button className="flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva Tarjeta
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar tarjeta..."
          className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-background shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredData.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground italic bg-slate-50 rounded-xl border border-dashed flex flex-col items-center justify-center">
            <CreditCard className="h-8 w-8 mb-2 opacity-20" />
            No se encontraron tarjetas.
          </div>
        ) : (
          filteredData.map(tarjeta => (
            <Card key={tarjeta.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-indigo-50 text-indigo-600">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{tarjeta.nombre}</h3>
                    {!tarjeta.activa && (
                      <span className="text-[10px] font-bold uppercase text-rose-400">
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500" onClick={() => handleEdit(tarjeta)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(tarjeta.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? "Editar Tarjeta" : "Nueva Tarjeta"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de la Tarjeta</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md bg-background" 
              placeholder="Ej: Visa Cecilia"
              required 
              value={formData.nombre} 
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
            />
          </div>
          <div className="flex items-center gap-2 py-2">
            <input 
              type="checkbox" 
              id="activa" 
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              checked={formData.activa} 
              onChange={(e) => setFormData({...formData, activa: e.target.checked})} 
            />
            <label htmlFor="activa" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
              Tarjeta Activa
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={closeModal}>Cancelar</Button>
            <Button type="submit">{editingId ? "Guardar Cambios" : "Crear Tarjeta"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tarjetas;
