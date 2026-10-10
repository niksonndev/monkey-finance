/**
 * Foto do usuário.
 *
 * O login é só com Google, então a foto costuma vir em
 * `user_metadata.avatar_url` (e às vezes em `picture`). Quando não há foto
 * — conta que entrou por outro caminho, ou a imagem falhou para carregar —
 * cai na inicial do nome/e-mail, para nunca aparecer um quadrado vazio.
 *
 * O fallback fica sempre no DOM, escondido atrás da foto: se a URL falhar
 * (link expirado, bloqueador de imagens), o `onError` esconde a foto e o
 * fallback aparece no mesmo lugar, sem buraco na interface.
 */
export default function Avatar({ user, className = 'h-10 w-10 text-base' }) {
  const foto = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const inicial = (
    user?.user_metadata?.full_name?.[0] ||
    user?.email?.[0] ||
    '?'
  ).toUpperCase();

  const fallback = (
    <div
      data-testid='avatar-fallback'
      className={`${className} flex items-center justify-center rounded-full bg-monkey-primary/20 font-semibold text-monkey-primary`}
    >
      {inicial}
    </div>
  );

  if (!foto) return fallback;

  return (
    <span className={`relative inline-flex ${className}`}>
      <img
        src={foto}
        alt=''
        referrerPolicy='no-referrer'
        className='h-full w-full rounded-full object-cover'
        onError={(e) => {
          e.currentTarget.remove();
        }}
      />
      {/* Atrás da foto: só aparece se ela for removida por erro de carregamento. */}
      <span className='absolute inset-0 -z-10'>{fallback}</span>
    </span>
  );
}
