import { TrendingDown } from 'lucide-react';
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

const DashboardCharts = ({ dataMes, mes }) => (
  <div className="grid gap-6 md:grid-cols-2">
    <Card className="shadow-md border-none">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Real vs Proyectado</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataMes.barData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(value) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Legend />
            <Bar dataKey="Proyectado" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
            <Bar dataKey="Real" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card className="shadow-md border-none">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-muted-foreground uppercase">Gastos por Categoría</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        {dataMes.gastosPorCat.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataMes.gastosPorCat}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {dataMes.gastosPorCat.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
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
);

export default DashboardCharts;
