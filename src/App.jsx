import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Movimientos from './pages/Movimientos';
import Categorias from './pages/Categorias';
import Proyecciones from './pages/Proyecciones';
import Comparativo from './pages/Comparativo';
import { DataProvider } from './context/DataContext';

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <DataProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
              <h1 className="text-xl font-black tracking-tighter text-primary italic">GesHogar</h1>
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
        </div>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
