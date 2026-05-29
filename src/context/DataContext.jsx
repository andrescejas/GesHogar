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
  const [subcategorias, setSubcategorias] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
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
  const saveProyeccion = useCallback(async (mes, categoriaId, monto, tipo, descripcion = '', subcategoriaId = '', responsable = '') => {
    await addDoc(collection(db, 'proyecciones'), {
      mes,
      categoriaId,
      montoProyectado: Number(monto),
      tipo,
      descripcion,
      subcategoriaId,
      responsable
    });
  }, []);

  const updateProyeccion = useCallback(async (id, datos) => {
    if (datos.montoProyectado) datos.montoProyectado = Number(datos.montoProyectado);
    await updateDoc(doc(db, 'proyecciones', id), datos);
  }, []);

  return (
    <DataContext.Provider value={{ 
      categorias, 
      subcategorias,
      tarjetas,
      movimientos, 
      proyecciones,
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
      updateProyeccion
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
