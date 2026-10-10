import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Traduz os erros de OAuth que aparecem na prática ao configurar o provedor. */
function mensagemDeErro(erro) {
  const texto = `${erro?.message ?? ''} ${erro?.error_description ?? ''}`;

  if (/provider is not enabled|unsupported provider/i.test(texto)) {
    return 'O login com Google ainda não foi habilitado no projeto Supabase (Authentication → Providers → Google).';
  }
  if (/redirect/i.test(texto)) {
    return 'A URL de retorno não está autorizada no Supabase (Authentication → URL Configuration → Redirect URLs).';
  }
  return (
    erro?.message ||
    erro?.error_description ||
    'Não foi possível entrar com o Google.'
  );
}

function GoogleLogo() {
  return (
    <svg viewBox='0 0 24 24' className='w-5 h-5' aria-hidden='true'>
      <path
        fill='#4285F4'
        d='M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.19a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.45-4.96 3.45-8.56Z'
      />
      <path
        fill='#34A853'
        d='M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v3A11.99 11.99 0 0 0 12 24Z'
      />
      <path
        fill='#FBBC05'
        d='M5.55 14.68a7.2 7.2 0 0 1 0-4.6v-3H1.7a12 12 0 0 0 0 10.6l3.85-3Z'
      />
      <path
        fill='#EA4335'
        d='M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.24 15.1 0 12 0A11.99 11.99 0 0 0 1.7 6.08l3.85 3C6.46 6.36 9 4.75 12 4.75Z'
      />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle } = useAuth();
  // A mensagem de erro do OAuth vem no hash da URL, e é lida na PRIMEIRA
  // renderização, não num efeito: assim não há segundo render, e o hash é
  // limpo na hora (senão a mensagem voltaria no F5).
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(
      window.location.hash.replace(/^#/, ''),
    );
    const descricao = params.get('error_description');

    if (!descricao) return '';
    window.history.replaceState(null, '', window.location.pathname);
    return mensagemDeErro({ message: descricao });
  });
  const [loading, setLoading] = useState(false);

  const handleEntrar = async () => {
    setError('');
    setLoading(true);

    const { error: erro } = await signInWithGoogle();

    // Sem erro o navegador já está indo para o Google: não tocar mais no estado.
    if (erro) {
      setError(mensagemDeErro(erro));
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='min-h-screen bg-monkey-bg flex items-center justify-center p-4'
    >
      <div className='w-full max-w-md'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className='text-center mb-8'
        >
          <div className='w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4'>
            <img
              src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
              alt='Monkey Finance'
              className='h-full w-full object-cover'
            />
          </div>
          <h1 className='text-3xl font-bold text-monkey-text'>
            Monkey Finance
          </h1>
          <p className='text-monkey-muted mt-2'>
            Entre para cuidar do seu dinheiro
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className='card'
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className='mb-6 p-3 bg-monkey-danger/10 border border-monkey-danger/20 rounded-lg text-sm text-monkey-danger flex items-start gap-2'
            >
              <AlertCircle className='w-4 h-4 flex-shrink-0 mt-0.5' />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type='button'
            onClick={handleEntrar}
            disabled={loading}
            className='w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors disabled:opacity-70'
          >
            {loading ? (
              <>
                <Loader2 className='w-5 h-5 animate-spin' />
                Abrindo o Google...
              </>
            ) : (
              <>
                <GoogleLogo />
                Entrar com Google
              </>
            )}
          </motion.button>

          <p className='mt-6 text-center text-sm text-monkey-muted'>
            Sua conta é criada automaticamente no primeiro acesso. Sem senha
            para esquecer — usamos apenas o login do Google.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
