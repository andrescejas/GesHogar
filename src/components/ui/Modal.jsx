import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border rounded-xl shadow-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
