import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar from '../Avatar';

describe('Avatar', () => {
  it('mostra a foto do Google quando existe', () => {
    render(
      <Avatar
        user={{ user_metadata: { avatar_url: 'https://exemplo.com/foto.jpg' } }}
      />,
    );
    const img = screen.getByAltText('');
    expect(img.getAttribute('src')).toBe('https://exemplo.com/foto.jpg');
  });

  it('aceita a foto no campo picture (formato antigo do Google)', () => {
    render(
      <Avatar user={{ user_metadata: { picture: 'https://exemplo.com/p.png' } }} />,
    );
    expect(screen.getByAltText('').getAttribute('src')).toBe(
      'https://exemplo.com/p.png',
    );
  });

  it('cai na inicial do nome quando não há foto', () => {
    render(<Avatar user={{ user_metadata: { full_name: 'Nik Son' } }} />);
    expect(screen.getByText('N')).toBeTruthy();
  });

  it('usa a inicial do e-mail quando não há nome', () => {
    render(<Avatar user={{ email: 'ana@exemplo.com' }} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('funciona sem usuário (mostra ?)', () => {
    render(<Avatar />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('se a foto falhar, o fallback com inicial continua no DOM', () => {
    render(
      <Avatar
        user={{ user_metadata: { avatar_url: 'https://ruim/404.jpg', full_name: 'Nik' } }}
      />,
    );
    // o fallback existe desde o início, atrás da foto
    expect(screen.getByTestId('avatar-fallback').textContent).toBe('N');

    // quando a foto falha, ela é removida e o fallback aparece no lugar
    fireEvent.error(screen.getByAltText(''));
    expect(screen.queryByAltText('')).toBeNull();
    expect(screen.getByTestId('avatar-fallback')).toBeTruthy();
  });
});
