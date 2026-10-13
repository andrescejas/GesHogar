import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { generarMovimientosRecurrentes } from '../lib/generadorRecurrentes';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [proyecciones, setProyecciones] = useState([]);
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Escuchar reglas de categorización en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'reglas_categorizacion'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReglas(data);
    }, (error) => console.error("Error Reglas:", error));
    return () => unsubscribe();
  }, []);

  // Escuchar categorías en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'categorias'), orderBy('nombre'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategorias(cats);
    }, (error) => console.error("Error Categorías:", error));
    return () => unsubscribe();
  }, []);

  // Escuchar movimientos reales en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'movimientos'), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const movs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovimientos(movs);
      setLoading(false);
    }, (error) => console.error("Error Movimientos:", error));
    return () => unsubscribe();
  }, []);

  // Escuchar proyecciones en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'proyecciones'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProyecciones(data);
    }, (error) => console.error("Error Proyecciones:", error));
    return () => unsubscribe();
  }, []);

  // Escuchar subcategorías en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'subcategorias'), orderBy('nombre'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubcategorias(data);
    }, (error) => console.error("Error Subcategorías:", error));
    return () => unsubscribe();
  }, []);

  // Escuchar tarjetas en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'tarjetas'), orderBy('nombre'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTarjetas(data);
    }, (error) => console.error("Error Tarjetas:", error));
    return () => unsubscribe();
  }, []);

  // CRUD Categorías
  const addCategoria = useCallback(async (nueva) => await addDoc(collection(db, 'categorias'), nueva), []);
  const updateCategoria = useCallback(async (id, datos) => await updateDoc(doc(db, 'categorias', id), datos), []);
  const deleteCategoria = useCallback(async (id) => await deleteDoc(doc(db, 'categorias', id)), []);

  // CRUD Subcategorías
  const addSubcategoria = useCallback(async (nueva) => await addDoc(collection(db, 'subcategorias'), nueva), []);
  const updateSubcategoria = useCallback(async (id, datos) => await updateDoc(doc(db, 'subcategorias', id), datos), []);
  const deleteSubcategoria = useCallback(async (id) => await deleteDoc(doc(db, 'subcategorias', id)), []);

  // CRUD Tarjetas
  const addTarjeta = useCallback(async (nueva) => await addDoc(collection(db, 'tarjetas'), nueva), []);
  const updateTarjeta = useCallback(async (id, datos) => await updateDoc(doc(db, 'tarjetas', id), datos), []);
  const deleteTarjeta = useCallback(async (id) => await deleteDoc(doc(db, 'tarjetas', id)), []);

  // CRUD Movimientos
  const addMovimiento = useCallback(async (nuevo) => await addDoc(collection(db, 'movimientos'), nuevo), []);
  const updateMovimiento = useCallback(async (id, datos) => await updateDoc(doc(db, 'movimientos', id), datos), []);
  const deleteMovimiento = useCallback(async (id) => await deleteDoc(doc(db, 'movimientos', id)), []);

  // CRUD Proyecciones
  const saveProyeccion = useCallback(async (datos) => {
    await addDoc(collection(db, 'proyecciones'), {
      ...datos,
      montoProyectado: Number(datos.montoProyectado || datos.monto || 0),
    });
  }, []);

  const updateProyeccion = useCallback(async (id, datos) => {
    if (datos.montoProyectado) datos.montoProyectado = Number(datos.montoProyectado);
    await updateDoc(doc(db, 'proyecciones', id), datos);
  }, []);

  const deleteProyeccion = useCallback(async (id) => await deleteDoc(doc(db, 'proyecciones', id)), []);

  // Guardado masivo por lote de proyecciones (WriteBatch)
  const saveProyeccionesBatch = useCallback(async (operaciones = []) => {
    if (!operaciones || operaciones.length === 0) return;
    const chunkSize = 400;
    for (let i = 0; i < operaciones.length; i += chunkSize) {
      const chunk = operaciones.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const op of chunk) {
        if (op.action === 'create') {
          const ref = doc(collection(db, 'proyecciones'));
          batch.set(ref, {
            ...op.data,
            montoProyectado: Number(op.data.montoProyectado || op.data.monto || 0),
            creadoEn: new Date().toISOString()
          });
        } else if (op.action === 'update') {
          const ref = doc(db, 'proyecciones', op.id);
          const updateData = { ...op.data };
          if (updateData.montoProyectado !== undefined) {
            updateData.montoProyectado = Number(updateData.montoProyectado);
          }
          batch.update(ref, {
            ...updateData,
            actualizadoEn: new Date().toISOString()
          });
        } else if (op.action === 'delete') {
          const ref = doc(db, 'proyecciones', op.id);
          batch.delete(ref);
        }
      }

      await batch.commit();
    }
  }, []);

  // CRUD Reglas de categorización
  const addRegla = useCallback(async (nueva) => await addDoc(collection(db, 'reglas_categorizacion'), nueva), []);
  const deleteRegla = useCallback(async (id) => await deleteDoc(doc(db, 'reglas_categorizacion', id)), []);

  // Importación masiva por lotes (WriteBatch)
  const importarMovimientosBatch = useCallback(async (movimientosAImportar = [], nuevasReglas = []) => {
    // 1. Guardar nuevas reglas aprendidas si las hay
    for (const regla of nuevasReglas) {
      if (regla.patron && regla.categoriaId) {
        await addDoc(collection(db, 'reglas_categorizacion'), {
          patron: regla.patron.toLowerCase().trim(),
          categoriaId: regla.categoriaId,
          subcategoriaId: regla.subcategoriaId || '',
          activo: true,
          creadoEn: new Date().toISOString()
        });
      }
    }

    // 2. Insertar movimientos en lotes de hasta 400
    const chunkSize = 400;
    for (let i = 0; i < movimientosAImportar.length; i += chunkSize) {
      const chunk = movimientosAImportar.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const mov of chunk) {
        const ref = doc(collection(db, 'movimientos'));
        // Limpiar campos temporales de UI
        // eslint-disable-next-line no-unused-vars
        const { idTemp, autoMatch, origenRegla, seleccionado, guardarRegla, esDuplicado, categoriaNombre, subcategoriaNombre, ...datosLimpios } = mov;
        batch.set(ref, {
          ...datosLimpios,
          importadoEn: new Date().toISOString()
        });
      }

      await batch.commit();
    }
  }, []);

  // Generador automático: cubre ventana mes actual + 3 meses sin duplicados
  const generandoRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (generandoRef.current) return;
    generandoRef.current = true;
    generarMovimientosRecurrentes(proyecciones, movimientos, addMovimiento)
      .catch(err => console.error('Error generando recurrentes:', err))
      .finally(() => { generandoRef.current = false; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyecciones, movimientos, loading]);

  return (
    <DataContext.Provider value={{ 
      categorias, 
      subcategorias,
      tarjetas,
      movimientos, 
      proyecciones,
      reglas,
      loading,
      addCategoria, 
      updateCategoria,
      deleteCategoria,
      addSubcategoria,
      updateSubcategoria,
      deleteSubcategoria,
      addTarjeta,
      updateTarjeta,
      deleteTarjeta,
      addMovimiento,
      updateMovimiento,
      deleteMovimiento,
      saveProyeccion,
      updateProyeccion,
      deleteProyeccion,
      saveProyeccionesBatch,
      addRegla,
      deleteRegla,
      importarMovimientosBatch
    }}>
      {children}
    </DataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => useContext(DataContext);
