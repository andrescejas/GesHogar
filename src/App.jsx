import { Component, lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AlertTriangle, Loader2, Menu, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { Button } from './components/ui/Button';
import { DataProvider } from './context/DataContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Movimientos = lazy(() => import('./pages/Movimientos'));
const Categorias = lazy(() => import('./pages/Categorias'));
const Tarjetas = lazy(() => import('./pages/Tarjetas'));
const Proyecciones = lazy(() => import('./pages/Proyecciones'));
const Comparativo = lazy(() => import('./pages/Comparativo'));
const Reporte = lazy(() => import('./pages/Reporte'));
const Configuracion = lazy(() => import('./pages/Configuracion'));

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
          <div className="p-3 bg-red-100 text-red-600 rounded-full mb-3">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Ocurrió un error inesperado al renderizar</h2>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4 font-mono bg-slate-100 p-2 rounded border">
            {this.state.error?.message || 'Error al procesar la pantalla.'}
          </p>
          <Button 
            size="sm" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 cursor-pointer font-semibold"
          >
            <RefreshCw className="h-4 w-4" /> Recargar aplicación
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
              <ErrorBoundary>
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
              </ErrorBoundary>
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
