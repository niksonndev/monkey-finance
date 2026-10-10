import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getSavedCurrency } from '../constants/currencies';
import { ocorrenciasVencidas } from '../utils/recurring';

/**
 * Recorrências do usuário: geração dos lançamentos vencidos e listagem para a
 * tela de configurações.
 *
 * A geração acontece no cliente porque o Monkey Finance não tem backend: quando o
 * app abre, todas as ocorrências já vencidas (inclusive de meses em que o
 * usuário não entrou) viram lançamentos em `transactions` e o `next_date` da
 * regra avança.
 */

/**
 * Uma execução por usuário por sessão. O Dashboard e a tela de Transações usam
 * o mesmo hook, e o StrictMode monta os efeitos duas vezes em dev — sem esta
 * trava a geração rodaria duplicada e lançaria a mesma cobrança duas vezes.
 */
const execucoes = new Map();

export function limparCacheRecorrencias() {
  execucoes.clear();
}

async function gerarVencidas(userId) {
  const { data: regras, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);

  if (error) throw error;

  let criadas = 0;

  for (const regra of regras ?? []) {
    const { vencidas, proxima } = ocorrenciasVencidas(regra);
    if (vencidas.length === 0) continue;

    const novas = vencidas.map((date) => ({
      user_id: userId,
      type: regra.type,
      amount: regra.amount,
      currency: regra.currency || getSavedCurrency(userId),
      category: regra.category,
      description: regra.description,
      date,
      is_recurring: true,
      recurring_frequency: regra.frequency,
    }));

    // Insere primeiro e só depois avança o next_date. Se a inserção falhar,
    // nada foi lançado a menos; se o avanço falhar, o pior caso é repetir um
    // lançamento (visível e apagável) em vez de perder a cobrança em silêncio.
    const { error: erroInsert } = await supabase
      .from('transactions')
      .insert(novas);

    if (erroInsert) {
      console.error('Erro ao lançar recorrência:', erroInsert);
      continue;
    }

    // Sem `proxima` o teto de segurança foi atingido: o next_date fica onde
    // está e o restante sai na próxima abertura do app.
    if (proxima) {
      const { error: erroUpdate } = await supabase
        .from('recurring_transactions')
        .update({ next_date: proxima })
        .eq('id', regra.id)
        .eq('user_id', userId);

      if (erroUpdate) {
        console.error('Erro ao avançar a próxima data da recorrência:', erroUpdate);
      }
    }

    criadas += novas.length;
  }

  return { criadas, error: null };
}

/**
 * Materializa as recorrências vencidas do usuário.
 * Chamadas concorrentes compartilham a mesma promise (e o mesmo resultado).
 */
export function materializeRecurrences(userId) {
  if (!userId) return Promise.resolve({ criadas: 0, error: null });

  if (!execucoes.has(userId)) {
    execucoes.set(
      userId,
      gerarVencidas(userId).catch((error) => {
        // Falhou: libera para tentar de novo na próxima montagem.
        execucoes.delete(userId);
        return { criadas: 0, error: error.message };
      }),
    );
  }

  return execucoes.get(userId);
}

/** Lista e encerra as recorrências ativas (usado na tela de Configurações). */
export function useRecurring() {
  const [recorrencias, setRecorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchRecorrencias = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('next_date', { ascending: true });

      if (error) throw error;
      setRecorrencias(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // A busca depende de dados do servidor, e não há valor inicial possível: o
  // efeito é a forma correta de sincronizar estado externo com o React (é
  // justamente o caso que a regra set-state-in-effect permite).
  useEffect(() => {
    fetchRecorrencias();
  }, [fetchRecorrencias]);

  /**
   * Encerra a recorrência: para de gerar lançamentos futuros sem apagar o
   * histórico (é um update de `active`, não um delete).
   */
  const encerrarRecorrencia = async (id) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .update({ active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setRecorrencias((prev) => prev.filter((r) => r.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    recorrencias,
    loading,
    error,
    encerrarRecorrencia,
    refetch: fetchRecorrencias,
  };
}
