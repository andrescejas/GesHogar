import { useState } from 'react';
import { TrendingDown, ChevronRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Modal from '../ui/Modal';

const fmtMoney = (val) =>
  `$${Number(val || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const DashboardCharts = ({ dataMes, mes }) => {
  const [selectedCat, setSelectedCat] = useState(null);
  const totalGastos = dataMes.egresosReales || (dataMes.gastosPorCat || []).reduce((acc, c) => acc + (Number(c.value) || 0), 0);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Real vs Proyectado */}
        <Card className="shadow-md border-none flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Real vs Proyectado
              </CardTitle>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Comparativa global
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-[320px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMes.barData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => (val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`)}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => fmtMoney(value)}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px' }} />
                <Bar dataKey="Proyectado" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={38} />
                <Bar dataKey="Real" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. Gastos por Categoría (Gráfico Circular + Leyenda Clickeable con Detalle) */}
        <Card className="shadow-md border-none flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Gastos por Categoría
                </CardTitle>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Hacé clic en un color o categoría para ver su detalle
                </p>
              </div>
              {dataMes.gastosPorCat?.length > 0 && (
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {dataMes.gastosPorCat.length} {dataMes.gastosPorCat.length === 1 ? 'categoría' : 'categorías'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="h-[320px] pt-2">
            {dataMes.gastosPorCat && dataMes.gastosPorCat.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between h-full gap-4">
                {/* Donut Chart (Click en los sectores abre el detalle) */}
                <div className="w-full sm:w-[45%] h-[180px] sm:h-full flex items-center justify-center shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataMes.gastosPorCat}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        cursor="pointer"
                        onClick={(entry) => {
                          const cat = entry?.payload || entry;
                          if (cat) setSelectedCat(cat);
                        }}
                      >
                        {dataMes.gastosPorCat.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke="#ffffff"
                            strokeWidth={2}
                            style={{ cursor: 'pointer' }}
                            className="hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedCat(entry)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => {
                          const pct = totalGastos > 0 ? ((value / totalGastos) * 100).toFixed(1) : 0;
                          return [`${fmtMoney(value)} (${pct}%) - Clic para ver detalle`, 'Gasto'];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Referencia de Nombres y Colores (Clickeables) */}
                <div className="w-full sm:w-[55%] h-full overflow-y-auto pr-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                  {dataMes.gastosPorCat.map((cat, idx) => {
                    const pct = totalGastos > 0 ? ((cat.value / totalGastos) * 100).toFixed(1) : '0';
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedCat(cat)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCat(cat);
                          }
                        }}
                        className="group flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer select-none"
                        title="Hacé clic para ver el desglose y movimientos"
                      >
                        {/* Círculo de Color + Nombre de Categoría (en Negro) */}
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10 group-hover:scale-110 transition-transform"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span
                            className="text-xs font-black truncate"
                            style={{ color: '#000000' }}
                          >
                            {cat.name}
                          </span>
                        </div>

                        {/* Monto y Porcentaje + Flecha sutil */}
                        <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-right">
                          <span
                            className="text-xs font-black"
                            style={{ color: '#000000' }}
                          >
                            {fmtMoney(cat.value)}
                          </span>
                          <span
                            className="text-[10px] font-black px-1.5 py-0.5 rounded-md border border-slate-300"
                            style={{ backgroundColor: `${cat.color}25`, color: '#000000' }}
                          >
                            {pct}%
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <TrendingDown className="h-8 w-8 opacity-20" />
                </div>
                <p className="text-xs font-bold uppercase italic">Sin gastos registrados en {mes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalle de Categoría */}
      <Modal
        isOpen={!!selectedCat}
        onClose={() => setSelectedCat(null)}
        title={
          selectedCat ? (
            <div className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-xs"
                style={{ backgroundColor: selectedCat.color }}
              />
              <span className="font-black text-lg text-slate-900">
                {selectedCat.name}
              </span>
            </div>
          ) : 'Detalle de Categoría'
        }
        maxWidth="max-w-2xl"
      >
        {selectedCat && (
          <div className="space-y-5">
            {/* Resumen del Gasto */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total del Mes</p>
                <p className="text-2xl font-black text-slate-950 tabular-nums">
                  {fmtMoney(selectedCat.value)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-200 text-slate-900 border border-slate-300">
                  {totalGastos > 0 ? ((selectedCat.value / totalGastos) * 100).toFixed(1) : 0}% del mes
                </span>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedCat.movimientos?.length || 0} movimientos
                </span>
              </div>
            </div>

            {/* Desglose por Subcategorías */}
            {selectedCat.subcategorias && selectedCat.subcategorias.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                  <span>Desglose por Subcategorías</span>
                  <span className="text-[11px] text-slate-500 font-semibold lowercase">
                    {selectedCat.subcategorias.length} {selectedCat.subcategorias.length === 1 ? 'subcategoría' : 'subcategorías'}
                  </span>
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedCat.subcategorias.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-900 truncate pr-2">
                          {sub.nombre}
                        </span>
                        <span className="font-black text-slate-900 shrink-0 tabular-nums">
                          {fmtMoney(sub.valor)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mt-1">
                        <span>{sub.cantidad} {sub.cantidad === 1 ? 'gasto' : 'gastos'}</span>
                        <span className="text-slate-800">{sub.porcentaje?.toFixed(0)}%</span>
                      </div>
                      {/* Barra de progreso */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(3, sub.porcentaje))}%`,
                            backgroundColor: selectedCat.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movimientos del Mes */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                <span>Movimientos Registrados ({selectedCat.movimientos?.length || 0})</span>
                <span className="text-[11px] text-slate-500 font-semibold">Ordenados por fecha</span>
              </h4>
              {selectedCat.movimientos && selectedCat.movimientos.length > 0 ? (
                <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                  {selectedCat.movimientos.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/90 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-black text-slate-950 truncate">
                          {m.descripcion || m.concepto || 'Sin descripción'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-0.5">
                          <span>{m.fecha?.split('-').reverse().join('/')}</span>
                          {m.subcategoriaId && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700">
                                {selectedCat.subcategorias?.find((s) => s.id === m.subcategoriaId)?.nombre}
                              </span>
                            </>
                          )}
                          {m.responsable && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 font-extrabold">{m.responsable}</span>
                            </>
                          )}
                          {m.cuenta && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600">{m.cuenta}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-black text-slate-950 tabular-nums">
                          {fmtMoney(m.monto)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-3 text-center">
                  No hay movimientos detallados registrados.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default DashboardCharts;
