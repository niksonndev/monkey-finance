import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { materializeRecurrences } from './useRecurring';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
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
    fetchTransactions();
  }, [fetchTransactions]);

  // Antes de manter a lista, gera os lançamentos das recorrências vencidas:
  // roda uma vez por sessão/usuário (trava em materializeRecurrences) e, se
  // algo foi criado, recarrega para os novos lançamentos já aparecerem.
  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelado = false;

    materializeRecurrences(user.id).then(({ criadas, error: erro }) => {
      if (erro) {
        console.error('Erro ao gerar recorrências vencidas:', erro);
        return;
      }
      if (!cancelado && criadas > 0) fetchTransactions();
    });

    return () => {
      cancelado = true;
    };
  }, [user?.id, fetchTransactions]);

  const addTransaction = async (transaction) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, user_id: user.id }])
        .select();

      if (error) throw error;
      setTransactions((prev) => [data[0], ...prev]);
      return { data: data[0], error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const updateTransaction = async (id, updates) => {
    if (!user) return { data: null, error: 'Usuário não autenticado' };

    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;
      if (!data?.length) {
        return {
          data: null,
          error: 'Transação não encontrada ou sem permissão',
        };
      }
      setTransactions((prev) => prev.map((t) => (t.id === id ? data[0] : t)));
      return { data: data[0], error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const deleteTransaction = async (id) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  // useCallback: mantém a identidade estável entre renders, senão os useMemo
  // das páginas (que dependem destas funções) recalculam a cada render.
  const getSummary = useCallback(
    (txs = transactions) => {
      let income = 0;
      let expenses = 0;

      // Laço único em vez de dois filter+reduce: soma receitas e despesas na
      // mesma passada (esta função é chamada a cada render do dashboard e da
      // tela de transações, com toda a lista do mês).
      for (const t of txs) {
        const valor = Number(t.amount);
        if (t.type === 'income') income += valor;
        else if (t.type === 'expense') expenses += valor;
      }

      return {
        income,
        expenses,
        balance: income - expenses,
      };
    },
    [transactions],
  );

  const getCategorySummary = useCallback((type, txs = transactions) => {
    return txs
      .filter((t) => t.type === type)
      .reduce((acc, t) => {
        const category = t.category || 'Outros';
        acc[category] = (acc[category] || 0) + Number(t.amount);
        return acc;
      }, {});
  }, [transactions]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getSummary,
    getCategorySummary,
    refetch: fetchTransactions,
  };
}
