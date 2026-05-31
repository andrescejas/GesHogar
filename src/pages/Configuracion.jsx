import { Link } from 'react-router-dom';
import { Activity, CalendarDays, CreditCard, Database, FolderTree, Gauge, LineChart, ReceiptText, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { cn } from '../lib/utils';

const fmt = (n) => `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Configuracion = () => {
  const {
    categorias,
    subcategorias,
    tarjetas,
    movimientos,
    proyecciones,
    loading
  } = useData();

  const mesActual = new Date().toISOString().substring(0, 7);
  const movimientosMes = movimientos.filter(m => m.fecha?.startsWith(mesActual) && m.contabiliza !== false);
  const ingresosMes = movimientosMes
    .filter(m => m.tipo === 'ingreso' && m.estado !== 'proyectado')
    .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  const egresosMes = movimientosMes
    .filter(m => m.tipo === 'egreso' && m.estado !== 'proyectado')
    .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  const ultimoMovimiento = movimientos[0]?.fecha || 'Sin movimientos';
  const tarjetasActivas = tarjetas.filter(t => t.activa !== false).length;

  const stats = [
    { label: 'Categorías', value: categorias.length, icon: FolderTree, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Subcategorías', value: subcategorias.length, icon: FolderTree, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Movimientos', value: movimientos.length, icon: ReceiptText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Proyecciones', value: proyecciones.length, icon: LineChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tarjetas activas', value: tarjetasActivas, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const shortcuts = [
    { title: 'Categorías y subcategorías', description: 'Mantener el árbol de clasificación.', path: '/categorias', icon: FolderTree },
    { title: 'Tarjetas', description: 'Administrar medios de pago activos.', path: '/tarjetas', icon: CreditCard },
    { title: 'Proyecciones', description: 'Revisar presupuestos y recurrentes.', path: '/proyecciones', icon: LineChart },
    { title: 'Reporte mensual', description: 'Auditar movimientos filtrados.', path: '/reporte', icon: ReceiptText },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            Configuración
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Estado general del sistema y accesos de mantenimiento.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-xs font-bold uppercase text-muted-foreground shadow-sm w-fit">
          <span className={cn('h-2 w-2 rounded-full', loading ? 'bg-amber-500' : 'bg-emerald-500')} />
          {loading ? 'Sincronizando' : 'Cloud Sync Activo'}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-full', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Resumen del mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Metric icon={CalendarDays} label="Mes actual" value={mesActual} />
            <Metric icon={Activity} label="Último movimiento" value={ultimoMovimiento} />
            <Metric label="Ingresos contabilizados" value={fmt(ingresosMes)} valueClassName="text-emerald-600" />
            <Metric label="Egresos contabilizados" value={fmt(egresosMes)} valueClassName="text-rose-600" />
            <Metric label="Saldo operativo" value={fmt(ingresosMes - egresosMes)} valueClassName={ingresosMes - egresosMes >= 0 ? 'text-slate-900' : 'text-rose-600'} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" />
              Mantenimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.path}
                to={shortcut.path}
                className="group rounded-md border bg-background p-4 transition-colors hover:bg-secondary"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-slate-100 p-2 text-slate-600 group-hover:bg-white">
                    <shortcut.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">{shortcut.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{shortcut.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value, valueClassName }) => (
  <div className="flex items-center justify-between gap-4 rounded-md border bg-background px-3 py-2">
    <span className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </span>
    <span className={cn('text-sm font-black text-right', valueClassName)}>{value}</span>
  </div>
);

export default Configuracion;
