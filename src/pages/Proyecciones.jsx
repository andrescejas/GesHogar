import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Save, Loader2, Plus, Trash2, Edit, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { cn } from '../lib/utils';

const Proyecciones = () => {
  const { categorias, subcategorias, proyecciones, movimientos, saveProyeccion, updateProyeccion, loading: contextLoading } = useData();
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    categoriaId: '',
    subcategoriaId: '',
    descripcion: '',
    responsable: '',
    monto: '',
  });

  const proyeccionesList = React.useMemo(() => {
    const proManuales = proyecciones.filter(p => p.mes === mes);
    
    const proysVirtualesCuotas = (movimientos || [])
      .filter(m => m.esCuota === true && m.fecha.startsWith(mes) && m.tipo === 'egreso' && m.contabiliza !== false)
      .map(m => ({
        id: `virtual-cuota-${m.id}`,
        categoriaId: m.categoriaId,
        subcategoriaId: m.subcategoriaId,
        montoProyectado: Number(m.monto),
        tipo: 'egreso',
        descripcion: m.descripcion,
        responsable: m.responsable,
        isVirtual: true,
        virtualType: 'Tarjeta'
      }));

    const proysVirtualesRecurrentes = (movimientos || [])
      .filter(m => m.recurrente === true && m.fecha.substring(0, 7) <= mes && m.tipo === 'egreso' && m.contabiliza !== false)
      .map(m => ({
        id: `virtual-recurrente-${m.id}`,
        categoriaId: m.categoriaId,
        subcategoriaId: m.subcategoriaId,
        montoProyectado: Number(m.monto),
        tipo: 'egreso',
        descripcion: `${m.descripcion} (Recurrente)`,
        responsable: m.responsable,
        isVirtual: true,
        virtualType: 'Recurrente'
      }));

    return [...proManuales, ...proysVirtualesCuotas, ...proysVirtualesRecurrentes];
  }, [proyecciones, movimientos, mes]);

  const handleOpenModal = (proyeccion = null) => {
    if (proyeccion) {
      setFormData({
        id: proyeccion.id,
        categoriaId: proyeccion.categoriaId,
        subcategoriaId: proyeccion.subcategoriaId || '',
        descripcion: proyeccion.descripcion || '',
        responsable: proyeccion.responsable || '',
        monto: proyeccion.montoProyectado.toString(),
      });
    } else {
      setFormData({ id: null, categoriaId: '', subcategoriaId: '', descripcion: '', responsable: '', monto: '' });
    }
    setIsModalOpen(true);
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

      if (formData.id) {
        await updateProyeccion(formData.id, {
          categoriaId: formData.categoriaId,
          subcategoriaId: formData.subcategoriaId,
          montoProyectado: Number(formData.monto),
          tipo: cat.tipo,
          descripcion: formData.descripcion,
          responsable: formData.responsable
        });
      } else {
        await saveProyeccion(mes, formData.categoriaId, formData.monto, cat.tipo, formData.descripcion, formData.subcategoriaId, formData.responsable);
      }
      
      setIsModalOpen(false);
      setFormData({ id: null, categoriaId: '', monto: '', descripcion: '' });
      alert('Proyección guardada correctamente');
    } catch (error) {
      console.error("Error al guardar:", error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta proyección?')) {
      setLoading(true);
      await deleteDoc(doc(db, 'proyecciones', id));
      setLoading(false);
    }
  };

  const duplicarMesAnterior = async () => {
    const date = new Date(mes + '-01');
    date.setMonth(date.getMonth() - 1);
    const mesAnterior = date.toISOString().substring(0, 7);

    setLoading(true);
    const q = query(collection(db, 'proyecciones'), where('mes', '==', mesAnterior));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      alert('No hay proyecciones en el mes anterior');
    } else {
      const promises = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        // Fallback para registros creados durante la transición de nombres de campos
        const subId = d.subcategoriaId || d.subcategoria || '';
        return saveProyeccion(mes, d.categoriaId, d.montoProyectado, d.tipo, d.descripcion || '', subId, d.responsable || '');
      });
      await Promise.all(promises);
      alert('Proyecciones duplicadas correctamente');
    }
    setLoading(false);
  };

  const renderTable = (tipo) => {
    const list = proyeccionesList.filter(p => {
      // Búsqueda
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (p.descripcion && p.descripcion.toLowerCase().includes(searchLower)) ||
        (categorias.find(c => c.id === p.categoriaId)?.nombre.toLowerCase().includes(searchLower)) ||
        (subcategorias.find(s => s.id === p.subcategoriaId)?.nombre.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

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
          <thead className="border-b">
            <tr>
              <th className="h-10 px-2 text-left font-medium text-muted-foreground">Subcategoría</th>
              <th className="h-10 px-2 text-left font-medium text-muted-foreground">Responsable</th>
              <th className="h-10 px-2 text-left font-medium text-muted-foreground">Descripción</th>
              <th className="h-10 px-2 text-right font-medium text-muted-foreground">Monto Proyectado</th>
              <th className="h-10 px-2 text-right w-10"></th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-muted-foreground italic">Sin proyecciones</td>
              </tr>
            ) : (
              Object.keys(grouped).map(catId => {
                const cat = categorias.find(c => c.id === catId);
                const items = grouped[catId];
                return (
                  <React.Fragment key={catId}>
                    <tr className="bg-muted/30">
                      <td colSpan="5" className="p-2 font-bold text-sm">
                        {cat?.icono || '📁'} {cat?.nombre || 'Categoría desconocida'}
                      </td>
                    </tr>
                    {items.map(p => (
                      <tr key={p.id} className={cn("border-b hover:bg-muted/50 transition-colors", p.isVirtual ? "bg-slate-50/40" : "")}>
                        <td className="p-2 pl-6 font-medium text-indigo-600">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
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
                        <td className="p-2 text-sm">
                          {p.responsable || 'Sin asignar'}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground truncate max-w-[150px]" title={p.descripcion}>
                          {p.descripcion || '-'}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-800">
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
                  </React.Fragment>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Presupuesto Mensual</h2>
          <p className="text-muted-foreground">Gestiona tus proyecciones como registros individuales.</p>
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
          <Button variant="outline" size="sm" onClick={duplicarMesAnterior} disabled={loading}>
            <Copy className="mr-2 h-4 w-4" /> Duplicar Anterior
          </Button>
          <Button size="sm" onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Proyección
          </Button>
        </div>
      </div>

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

      <Card className="bg-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-around gap-4 text-center">
            <div>
              <p className="text-xs opacity-60 uppercase font-bold">Total Ingresos</p>
              <p className="text-2xl font-bold text-emerald-400">
                ${proyeccionesList.filter(p => p.tipo === 'ingreso').reduce((acc, p) => acc + (Number(p.montoProyectado) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-60 uppercase font-bold">Total Gastos</p>
              <p className="text-2xl font-bold text-rose-400">
                ${proyeccionesList.filter(p => p.tipo === 'egreso').reduce((acc, p) => acc + (Number(p.montoProyectado) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-60 uppercase font-bold">Saldo Proyectado</p>
              <p className="text-2xl font-bold text-indigo-400">
                ${(
                  proyeccionesList.filter(p => p.tipo === 'ingreso').reduce((acc, p) => acc + (Number(p.montoProyectado) || 0), 0) - 
                  proyeccionesList.filter(p => p.tipo === 'egreso').reduce((acc, p) => acc + (Number(p.montoProyectado) || 0), 0)
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={formData.id ? "Editar Proyección" : "Agregar Proyección"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <option value="Andres">Andres</option>
              <option value="Cecilia">Cecilia</option>
              <option value="Agustin">Agustin</option>
            </select>
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
