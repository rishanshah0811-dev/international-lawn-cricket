'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={ref}
        className="relative w-full max-w-lg bg-bg-card border-t border-border rounded-t-2xl p-6 pb-10 animate-slide-up"
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary mb-4">
          {title}
        </h2>
        {children}
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
