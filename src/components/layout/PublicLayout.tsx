import React from 'react';
import { Outlet } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-arena-dark text-white flex flex-col items-center justify-between relative overflow-hidden">
      {/* Glow background ambiance */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-arena-red/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 bg-arena-blue/10 rounded-full blur-3xl" />

      <main className="w-full max-w-md mx-auto flex-1 flex flex-col px-4 py-6 relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;

