import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2, Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { DataProvider } from './context/DataContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Movimientos = lazy(() => import('./pages/Movimientos'));
const Categorias = lazy(() => import('./pages/Categorias'));
const Tarjetas = lazy(() => import('./pages/Tarjetas'));
const Proyecciones = lazy(() => import('./pages/Proyecciones'));
const Comparativo = lazy(() => import('./pages/Comparativo'));
const Reporte = lazy(() => import('./pages/Reporte'));
const Configuracion = lazy(() => import('./pages/Configuracion'));

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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/movimientos" element={<Movimientos />} />
                  <Route path="/categorias" element={<Categorias />} />
                  <Route path="/tarjetas" element={<Tarjetas />} />
                  <Route path="/proyecciones" element={<Proyecciones />} />
                  <Route path="/comparativo" element={<Comparativo />} />
                  <Route path="/reporte" element={<Reporte />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </DataProvider>
  );
}

const PageLoader = () => (
  <div className="flex h-full min-h-[240px] items-center justify-center text-sm font-medium text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Cargando pantalla...
  </div>
);

export default App;
