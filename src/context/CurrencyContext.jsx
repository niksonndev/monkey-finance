import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import {
  CURRENCIES,
  getSavedCurrency,
  isCurrency,
  saveCurrency,
} from '../constants/currencies';
import { formatCurrency } from '../utils/formatters';

/**
 * Moeda do app: uma configuração global por usuário, guardada no localStorage
 * (mesmo padrão das preferências de notificação). Tudo que exibe valor usa
 * `formatValue` daqui, então trocar a moeda muda a unidade no app inteiro.
 */
const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  // A moeda é lida no primeiro render, a partir do usuário já conhecido, e
  // trocada de estado quando o usuário muda (ver observação abaixo). Ler num
  // efeito faria a tela nascer com BRL e só depois corrigir para a moeda salva.
  const [currency, setCurrencyState] = useState(() =>
    getSavedCurrency(user?.id),
  );

  /**
   * A lista do contexto de auth chega assíncrona (`loading` no AuthProvider),
   * então na primeira renderização `user` ainda é `null` e o estado acima cai
   * em BRL. Quando o usuário aparece, reidratamos com a moeda dele.
   *
   * A leitura está fora do setState (o valor só é computado se for diferente do
   * que já está em tela), e a comparação de referência evita o laço infinito:
   * o código da moeda é uma string, então ids iguais não re-renderizam.
   */
  useEffect(() => {
    setCurrencyState((atual) => {
      const salva = getSavedCurrency(user?.id);
      return salva === atual ? atual : salva;
    });
  }, [user?.id]);

  const setCurrency = useCallback(
    (code) => {
      if (!isCurrency(code)) return;

      setCurrencyState(code);
      saveCurrency(user?.id, code);
    },
    [user?.id],
  );

  const value = useMemo(
    () => ({
      currency,
      currencies: CURRENCIES,
      setCurrency,
      /** Formata um valor na moeda ativa do app. */
      formatValue: (valor) => formatCurrency(valor, currency),
    }),
    [currency, setCurrency],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency deve ser usado dentro de um CurrencyProvider');
  }
  return context;
}
