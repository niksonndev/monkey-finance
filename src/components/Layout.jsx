import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useState } from 'react';

/**
 * Casca do app logado: menu lateral (fixo no desktop, gaveta no celular) e
 * barra superior no celular.
 *
 * O menu é fechado pela própria mudança de rota (useEffect abaixo), não pelo
 * clique no item. Antes cada NavLink chamava onClose, e a gaveta somia mas o
 * véu escuro ficava: o AnimatePresence do véu só sai quando o estado muda, e
 * a Sidebar anima `x` sozinha, então o véu e a gaveta acabavam fora de
 * sincronia e a tela ficava inutilizável até um F5.
 */
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Toda navegação fecha a gaveta. É a fonte única do "fechar": não depende
  // de cada link lembrar de chamar onClose.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className='min-h-screen bg-monkey-bg'>
      {/* Véu escuro, só no celular. Some no mesmo instante em que a rota muda
          (o efeito acima roda junto com a navegação). */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/50 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className='lg:pl-64 min-h-screen'>
        <MobileNav onMenuClick={() => setSidebarOpen(true)} />
        <main className='px-4 pb-6 pt-20 lg:p-8 lg:pt-8'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
