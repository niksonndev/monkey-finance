import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase, supabaseUrl, supabaseKey } from '../lib/supabaseClient';
import { limparCacheRecorrencias } from '../hooks/useRecurring';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * O usuário não é buscado num efeito: `onAuthStateChange` dispara
   * `INITIAL_SESSION` logo após a inscrição, com a sessão já recuperada do
   * localStorage (ou `null`, quando não há sessão). É aí que o estado sai de
   * "carregando" — um efeito só para `getUser()` renderizaria duas vezes e
   * ainda correria o risco de a inscrição chegar antes da resposta.
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      setUser(null);
    }
  }, []);

  /**
   * Login exclusivamente via Google. O app é uma SPA estática sem backend, e o
   * OAuth é resolvido no Supabase: ele devolve a sessão no hash da URL de volta
   * (detectSessionInUrl), que o supabase-js troca por sessão automaticamente.
   */
  const signInWithGoogle = async () => {
    // Sem o provedor habilitado no Supabase, o OAuth devolve uma página JSON
    // crua (o usuário sai do app e não entende nada). A lista de provedores é
    // pública, então checamos antes de mandar o navegador para lá.
    try {
      const resposta = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabaseKey },
      });
      const settings = await resposta.json();

      if (settings?.external?.google !== true) {
        return {
          data: null,
          error: { message: 'provider is not enabled: google' },
        };
      }
    } catch (erro) {
      // Não deu para checar (rede/offline): segue para o OAuth e deixa o
      // Supabase responder.
      console.warn('Não foi possível verificar os provedores de login:', erro);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Volta para a raiz do app, respeitando a base (/monkey-finance/ no
        // Pages).
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Limpa a trava de geração por sessão: quem entrar em seguida (ou o mesmo
    // usuário mais tarde) precisa materializar as recorrências de novo.
    limparCacheRecorrencias();
    return { error };
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
