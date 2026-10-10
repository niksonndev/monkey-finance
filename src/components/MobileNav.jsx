import { Menu, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Barra superior do celular (fixa). Só aparece abaixo de lg: no desktop o
 * menu lateral já dá acesso a tudo.
 */
export default function MobileNav({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className='fixed top-0 left-0 right-0 z-30 border-b border-monkey-muted/30 bg-monkey-card/95 backdrop-blur-sm lg:hidden'>
      <div className='flex h-14 items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-monkey-primary rounded-lg flex items-center justify-center'>
            <Wallet className='w-5 h-5 text-monkey-bg' />
          </div>
          <span className='font-bold text-monkey-text'>
            Monkey Finance
          </span>
        </div>

        <div className='flex items-center gap-2'>
          {user && (
            <span className='hidden max-w-[120px] truncate text-xs text-monkey-muted sm:block'>
              {user.email}
            </span>
          )}
          <button
            onClick={onMenuClick}
            className='rounded-lg p-2 text-monkey-text transition-colors hover:bg-monkey-muted/10'
            aria-label='Abrir menu'
          >
            <Menu className='w-6 h-6' />
          </button>
        </div>
      </div>
    </header>
  );
}
