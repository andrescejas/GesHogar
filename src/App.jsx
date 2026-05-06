import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Movimientos from './pages/Movimientos';
import Categorias from './pages/Categorias';
import Proyecciones from './pages/Proyecciones';
import Comparativo from './pages/Comparativo';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/movimientos" element={<Movimientos />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/proyecciones" element={<Proyecciones />} />
              <Route path="/comparativo" element={<Comparativo />} />
              <Route path="/configuracion" element={<div>Configuración</div>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
