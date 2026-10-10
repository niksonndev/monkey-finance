import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transações', icon: CreditCard },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

/**
 * Menu lateral.
 *
 * No desktop fica sempre à vista; no celular é uma gaveta que entra e sai.
 * Quem decide o estado é o Layout (que fecha na troca de rota) — aqui só
 * desenhamos a partir de `isOpen`.
 *
 * A gaveta do celular usa transição CSS curta (translate + transition), não
 * mola: a mola do framer-motion tinha um estiramento inicial que parecia
 * lento e depois rápido, sem fluidez. No desktop não há transição nenhuma
 * (o menu já está no lugar).
 */
export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <>
      {/* Desktop: sempre visível, sem animação. */}
      <aside className='fixed top-0 left-0 z-50 hidden h-screen w-64 flex-col border-r border-monkey-muted/30 bg-monkey-card lg:flex'>
        <div className='flex h-16 items-center px-4 border-b border-monkey-muted/30'>
          <NavLink to='/dashboard' className='flex items-center gap-2'>
            <img
              src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
              alt='Monkey Finance'
              className='h-8 w-8 rounded-lg'
            />
            <span className='font-bold text-monkey-text text-lg'>
              Monkey Finance
            </span>
          </NavLink>
        </div>

        <nav className='flex-1 space-y-1 overflow-y-auto px-3 py-4'>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                      ? 'bg-monkey-primary/20 text-monkey-primary'
                      : 'text-monkey-muted hover:bg-monkey-muted/10 hover:text-monkey-text'
                  }`
                }
              >
                <Icon className='w-5 h-5 flex-shrink-0' aria-hidden='true' />
                <span className='font-medium'>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className='border-t border-monkey-muted/30 p-3'>
          {user && (
            <div className='mb-3 flex items-center gap-2.5 rounded-lg bg-monkey-muted/10 px-3 py-2'>
              <Avatar user={user} className='h-8 w-8 shrink-0 text-sm' />
              <p className='truncate text-xs text-monkey-muted'>
                {user.email}
              </p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className='w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-monkey-danger transition-colors hover:bg-monkey-danger/10'
          >
            <LogOut className='w-5 h-5 flex-shrink-0' aria-hidden='true' />
            <span className='font-medium'>Sair</span>
          </button>
        </div>
      </aside>

      {/* Celular: gaveta que desliza. Some do fluxo quando fechada (para não
          capturar toques fora da tela). */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-monkey-muted/30 bg-monkey-card transition-transform duration-200 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          visibility: isOpen ? 'visible' : 'hidden',
          transitionProperty: 'transform, visibility',
        }}
      >
        <div className='flex h-16 items-center px-4 border-b border-monkey-muted/30'>
          <div className='flex items-center gap-2'>
            <img
              src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
              alt='Monkey Finance'
              className='h-8 w-8 rounded-lg'
            />
            <span className='font-bold text-monkey-text text-lg'>Menu</span>
          </div>
        </div>

        <nav className='flex-1 space-y-1 overflow-y-auto px-3 py-4'>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-monkey-primary/20 text-monkey-primary'
                    : 'text-monkey-muted hover:bg-monkey-muted/10 hover:text-monkey-text'
                }`}
              >
                <Icon className='w-5 h-5 flex-shrink-0' aria-hidden='true' />
                <span className='font-medium'>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className='border-t border-monkey-muted/30 p-3'>
          {user && (
            <div className='mb-3 flex items-center gap-2.5 rounded-lg bg-monkey-muted/10 px-3 py-2'>
              <Avatar user={user} className='h-8 w-8 shrink-0 text-sm' />
              <p className='truncate text-xs text-monkey-muted'>
                {user.email}
              </p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className='w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-monkey-danger transition-colors hover:bg-monkey-danger/10'
          >
            <LogOut className='w-5 h-5 flex-shrink-0' aria-hidden='true' />
            <span className='font-medium'>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
