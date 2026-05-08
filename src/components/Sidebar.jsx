import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, LayoutDashboard, ReceiptText, Tags, LineChart, Scale } from 'lucide-react';
import { cn } from '../lib/utils';

const Sidebar = ({ onClose }) => {
  const links = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Movimientos', icon: ReceiptText, path: '/movimientos' },
    { name: 'Categorías', icon: Tags, path: '/categorias' },
    { name: 'Proyecciones', icon: LineChart, path: '/proyecciones' },
    { name: 'Comparativo', icon: Scale, path: '/comparativo' },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card shadow-xl md:shadow-none">
      <div className="flex h-16 items-center justify-between px-6">
        <h1 className="text-xl font-black tracking-tighter text-primary italic">GesHogar</h1>
        {onClose && (
          <button 
            onClick={onClose} 
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-secondary hover:text-primary"
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Cloud Sync Activo
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
