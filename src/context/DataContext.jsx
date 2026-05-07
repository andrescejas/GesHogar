import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
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
  where,
  getDocs
} from 'firebase/firestore';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [categorias, setCategorias] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [proyecciones, setProyecciones] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Función para cargar proyecciones de un mes específico (bajo demanda para evitar sobrecarga)
  const loadProyecciones = useCallback(async (mes) => {
    const q = query(collection(db, 'proyecciones'), where('mes', '==', mes));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setProyecciones(data);
    return data;
  }, []);

  // CRUD Categorías
  const addCategoria = useCallback(async (nueva) => await addDoc(collection(db, 'categorias'), nueva), []);
  const updateCategoria = useCallback(async (id, datos) => await updateDoc(doc(db, 'categorias', id), datos), []);
  const deleteCategoria = useCallback(async (id) => await deleteDoc(doc(db, 'categorias', id)), []);

  // CRUD Movimientos
  const addMovimiento = useCallback(async (nuevo) => await addDoc(collection(db, 'movimientos'), nuevo), []);
  const updateMovimiento = useCallback(async (id, datos) => await updateDoc(doc(db, 'movimientos', id), datos), []);
  const deleteMovimiento = useCallback(async (id) => await deleteDoc(doc(db, 'movimientos', id)), []);

  // CRUD Proyecciones
  const saveProyeccion = useCallback(async (mes, categoriaId, monto, tipo, descripcion = '') => {
    const q = query(collection(db, 'proyecciones'), 
      where('mes', '==', mes), 
      where('categoriaId', '==', categoriaId)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      await updateDoc(doc(db, 'proyecciones', snapshot.docs[0].id), { 
        montoProyectado: Number(monto),
        descripcion: descripcion
      });
    } else {
      await addDoc(collection(db, 'proyecciones'), {
        mes,
        categoriaId,
        montoProyectado: Number(monto),
        tipo,
        descripcion: descripcion
      });
    }
  }, []);

  const updateProyeccion = useCallback(async (id, datos) => {
    if (datos.montoProyectado) datos.montoProyectado = Number(datos.montoProyectado);
    await updateDoc(doc(db, 'proyecciones', id), datos);
  }, []);

  return (
    <DataContext.Provider value={{ 
      categorias, 
      movimientos, 
      proyecciones,
      loading,
      loadProyecciones,
      addCategoria, 
      updateCategoria,
      deleteCategoria,
      addMovimiento,
      updateMovimiento,
      deleteMovimiento,
      saveProyeccion,
      updateProyeccion
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
