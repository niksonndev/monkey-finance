import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Bell,
  Trash2,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  LogOut,
  Repeat,
  Coins,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { currencyInfo } from '../constants/currencies';
import { supabase } from '../lib/supabaseClient';
import { useRecurring } from '../hooks/useRecurring';
import { formatDate } from '../utils/formatters';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [encerrandoId, setEncerrandoId] = useState(null);

  const { currency, currencies, setCurrency, formatValue } = useCurrency();

  const {
    recorrencias,
    loading: loadingRecorrencias,
    error: erroRecorrencias,
    encerrarRecorrencia,
  } = useRecurring();

  // Inicializado a partir dos metadados do usuário: o nome salvo em
  // auth.updateUser({ data: { full_name } }) precisa voltar ao formulário ao
  // reabrir a tela (antes ficava sempre vazio, mesmo depois de salvo).
  const [profileData, setProfileData] = useState(() => ({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
  }));

  /**
   * Preferências persistidas por usuário no localStorage. Lidas na primeira
   * renderização com `key` na chave: trocar de conta remonta a lista e cada
   * item relê do storage (sem efeito, sem piscar o valor antigo).
   */
  const [notifications, setNotifications] = useState(() => {
    const padrao = {
      emailNotifications: true,
      pushNotifications: false,
      weeklyReport: true,
      monthlyReport: true,
    };
    if (!user?.id) return padrao;
    try {
      const stored = localStorage.getItem(
        `monkeynanca:notifications:${user.id}`,
      );
      return stored ? { ...padrao, ...JSON.parse(stored) } : padrao;
    } catch (err) {
      console.error('Erro ao carregar preferências de notificação:', err);
      return padrao;
    }
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: profileData.fullName },
      });
      if (error) throw error;
      await refreshUser();
      showMessage('success', 'Perfil atualizado com sucesso!');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key, value) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(
          `monkeynanca:notifications:${user.id}`,
          JSON.stringify(next),
        );
      } catch (err) {
        console.error('Erro ao salvar preferências de notificação:', err);
      }
      return next;
    });
    showMessage('success', 'Preferência salva');
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir sua conta? Esta ação é irreversível.',
      )
    )
      return;
    if (
      !window.confirm(
        'TODOS os seus dados serão perdidos permanentemente. Confirmar exclusão?',
      )
    )
      return;

    setLoading(true);
    try {
      // A API admin (auth.admin.deleteUser) exige a service_role key e não
      // pode ser usada no browser. A exclusão é feita via RPC criada na
      // migration supabase/migrations/001_create_delete_account_function.sql
      const { error } = await supabase.rpc('delete_account');
      if (error) throw error;
      await signOut();
      navigate('/login');
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'currency', label: 'Moeda', icon: Coins },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'recurring', label: 'Recorrências', icon: Repeat },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'danger', label: 'Zona de perigo', icon: AlertCircle },
  ];

  /**
   * Troca a moeda do app inteiro. Não há conversão: os valores já lançados
   * continuam iguais, só a unidade exibida muda — o aviso na tela deixa isso
   * explícito para não parecer que o saldo foi convertido.
   */
  const handleCurrencyChange = (code) => {
    if (code === currency) return;
    setCurrency(code);
    showMessage('success', `Moeda alterada para ${currencyInfo(code).label}`);
  };

  /**
   * Encerra a recorrência: para de gerar lançamentos futuros. Os lançamentos já
   * criados ficam no histórico — a regra é desativada, não apagada.
   */
  const handleEncerrarRecorrencia = async (recorrencia) => {
    if (
      !window.confirm(
        'Encerrar esta recorrência? Nenhum lançamento novo será gerado (os que já existem continuam no histórico).',
      )
    ) {
      return;
    }

    setEncerrandoId(recorrencia.id);
    const { error } = await encerrarRecorrencia(recorrencia.id);
    setEncerrandoId(null);

    if (error) {
      showMessage('error', error);
      return;
    }
    showMessage('success', 'Recorrência encerrada');
  };

  return (
    <div className='space-y-6'>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
      >
        <div>
          <h1 className='text-2xl font-bold text-monkey-text'>Configurações</h1>
          <p className='text-monkey-muted text-sm'>
            Gerencie sua conta e preferências
          </p>
        </div>
      </motion.div>

      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-monkey-success/10 border border-monkey-success/20 text-monkey-success'
              : 'bg-monkey-danger/10 border border-monkey-danger/20 text-monkey-danger'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className='w-5 h-5 flex-shrink-0' />
          ) : (
            <AlertCircle className='w-5 h-5 flex-shrink-0' />
          )}
          <span className='text-sm'>{message.text}</span>
        </motion.div>
      )}

      <div className='card'>
        <div className='border-b border-monkey-muted/30'>
          <nav className='flex gap-1 p-1 overflow-x-auto' aria-label='Configurações'>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                    isActive
                      ? 'bg-monkey-primary/20 text-monkey-primary'
                      : 'text-monkey-muted hover:text-monkey-text hover:bg-monkey-muted/10'
                  }`}
                >
                  <Icon className='w-4 h-4' />
                  {tab.label}
                </motion.button>
              );
            })}
          </nav>
        </div>

        <div className='p-6'>
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6 max-w-md'
            >
              <div className='flex items-center gap-4'>
                <div className='w-20 h-20 bg-monkey-primary/20 rounded-2xl flex items-center justify-center'>
                  <User className='w-10 h-10 text-monkey-primary' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-monkey-text'>
                    {profileData.fullName ||
                      user?.email?.split('@')[0] ||
                      'Usuário'}
                  </h3>
                  <p className='text-monkey-muted text-sm'>{user?.email}</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className='space-y-4'>
                <div>
                  <label
                    htmlFor='fullName'
                    className='block text-sm font-medium text-monkey-text mb-2'
                  >
                    Nome completo
                  </label>
                  <input
                    id='fullName'
                    type='text'
                    value={profileData.fullName}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    className='input-field'
                    placeholder='Seu nome'
                  />
                </div>

                <div>
                  <label
                    htmlFor='email'
                    className='block text-sm font-medium text-monkey-text mb-2'
                  >
                    E-mail
                  </label>
                  <input
                    id='email'
                    type='email'
                    value={profileData.email}
                    className='input-field bg-monkey-muted/10 cursor-not-allowed'
                    disabled
                  />
                  <p className='text-xs text-monkey-muted mt-1'>
                    O e-mail não pode ser alterado
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type='submit'
                  disabled={loading}
                  className='w-full btn-primary py-3 flex items-center justify-center gap-2'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className='w-5 h-5' />
                      Salvar alterações
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {activeTab === 'currency' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6 max-w-md'
            >
              <div>
                <h3 className='text-lg font-semibold text-monkey-text mb-2'>
                  Moeda do app
                </h3>
                <p className='text-monkey-muted text-sm'>
                  Vale para o app inteiro: cards, lista de transações, gráficos,
                  filtros e as recorrências.
                </p>
              </div>

              <div className='space-y-2'>
                {currencies.map((moeda) => {
                  const ativa = currency === moeda.code;
                  return (
                    <button
                      key={moeda.code}
                      type='button'
                      onClick={() => handleCurrencyChange(moeda.code)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                        ativa
                          ? 'border-monkey-primary bg-monkey-primary/10'
                          : 'border-monkey-muted/30 bg-monkey-card hover:border-monkey-primary/50'
                      }`}
                    >
                      <span className='flex items-center gap-3'>
                        <span className='w-8 text-lg font-semibold text-monkey-text text-center'>
                          {moeda.symbol}
                        </span>
                        <span className='text-left'>
                          <span className='block text-monkey-text font-medium'>
                            {moeda.label}
                          </span>
                          <span className='block text-xs text-monkey-muted'>
                            {moeda.code}
                          </span>
                        </span>
                      </span>
                      {ativa && (
                        <CheckCircle className='w-5 h-5 text-monkey-primary' />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className='flex items-start gap-3 p-4 bg-monkey-muted/10 border border-monkey-muted/20 rounded-lg'>
                <AlertCircle className='w-5 h-5 text-monkey-primary flex-shrink-0 mt-0.5' />
                <p className='text-sm text-monkey-muted'>
                  Trocar a moeda{' '}
                  <strong className='text-monkey-text'>não converte</strong> os
                  valores já lançados — o app não usa cotação. Os números
                  continuam iguais e só a unidade muda: um lançamento de 50
                  aparece como {currencyInfo('BRL').symbol} 50,00 antes e como{' '}
                  {currencyInfo('EUR').symbol} 50,00 depois.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6 max-w-md'
            >
              <div>
                <h3 className='text-lg font-semibold text-monkey-text mb-2'>
                  Como você entra
                </h3>
                <p className='text-monkey-muted text-sm'>
                  O Monkey Finance usa somente o login do Google: não existe senha
                  própria do app para criar, trocar ou esquecer.
                </p>
              </div>

              <div className='flex items-start gap-3 p-4 bg-monkey-muted/10 border border-monkey-muted/20 rounded-lg'>
                <Lock className='w-5 h-5 text-monkey-primary flex-shrink-0 mt-0.5' />
                <div className='text-sm text-monkey-muted'>
                  <p className='text-monkey-text font-medium mb-1'>
                    Conta conectada
                  </p>
                  <p className='truncate'>{user?.email}</p>
                  <p className='mt-2'>
                    Para trocar a senha, revisar dispositivos ou remover o
                    acesso deste app, use as configurações da sua Conta Google.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'recurring' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-4 max-w-2xl'
            >
              <div>
                <h3 className='text-lg font-semibold text-monkey-text mb-2'>
                  Recorrências ativas
                </h3>
                <p className='text-monkey-muted text-sm'>
                  Lançamentos que se repetem sozinhos. Ao abrir o app, as
                  ocorrências já vencidas — inclusive de meses em que você não
                  entrou — entram automaticamente na sua lista.
                </p>
              </div>

              {loadingRecorrencias && (
                <div className='flex items-center gap-2 text-monkey-muted text-sm py-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Carregando recorrências...
                </div>
              )}

              {!loadingRecorrencias && erroRecorrencias && (
                <p className='text-sm text-monkey-danger bg-monkey-danger/10 border border-monkey-danger/20 p-3 rounded-lg'>
                  {erroRecorrencias}
                </p>
              )}

              {!loadingRecorrencias &&
                !erroRecorrencias &&
                recorrencias.length === 0 && (
                  <div className='card flex flex-col items-center justify-center py-10 text-center'>
                    <div className='w-14 h-14 bg-monkey-muted/10 rounded-full flex items-center justify-center mb-3'>
                      <Repeat className='w-7 h-7 text-monkey-muted' />
                    </div>
                    <h4 className='font-medium text-monkey-text mb-1'>
                      Nenhuma recorrência ativa
                    </h4>
                    <p className='text-sm text-monkey-muted max-w-sm'>
                      Ao criar uma transação, marque “Transação recorrente” para
                      que ela se repita toda semana ou todo mês.
                    </p>
                  </div>
                )}

              {!loadingRecorrencias &&
                recorrencias.map((recorrencia) => (
                  <div
                    key={recorrencia.id}
                    className='card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3'
                  >
                    <div
                      className={`w-2 h-full rounded-full ${
                        recorrencia.type === 'income'
                          ? 'bg-monkey-success'
                          : 'bg-monkey-danger'
                      }`}
                    />

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='font-medium text-monkey-text truncate'>
                          {recorrencia.category || 'Sem categoria'}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            recorrencia.type === 'income'
                              ? 'text-monkey-success bg-monkey-success/10'
                              : 'text-monkey-danger bg-monkey-danger/10'
                          }`}
                        >
                          {recorrencia.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                        <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-monkey-primary/20 text-monkey-primary'>
                          {recorrencia.frequency === 'weekly'
                            ? 'Semanal'
                            : 'Mensal'}
                        </span>
                      </div>

                      {recorrencia.description && (
                        <p className='text-sm text-monkey-muted truncate mt-1'>
                          {recorrencia.description}
                        </p>
                      )}

                      <p className='text-xs text-monkey-muted mt-1'>
                        Próximo lançamento: {formatDate(recorrencia.next_date)}
                      </p>
                    </div>

                    <div className='flex items-center justify-between sm:justify-end gap-3'>
                      <span
                        className={`font-bold whitespace-nowrap ${
                          recorrencia.type === 'income'
                            ? 'text-monkey-success'
                            : 'text-monkey-danger'
                        }`}
                      >
                        {recorrencia.type === 'income' ? '+' : '-'}
                        {formatValue(recorrencia.amount)}
                      </span>

                      <button
                        type='button'
                        onClick={() => handleEncerrarRecorrencia(recorrencia)}
                        disabled={encerrandoId === recorrencia.id}
                        className='flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-monkey-danger bg-monkey-danger/10 border border-monkey-danger/20 hover:bg-monkey-danger/20 transition-colors disabled:opacity-60'
                      >
                        {encerrandoId === recorrencia.id ? (
                          <Loader2 className='w-4 h-4 animate-spin' />
                        ) : (
                          <Trash2 className='w-4 h-4' />
                        )}
                        Encerrar
                      </button>
                    </div>
                  </div>
                ))}
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6 max-w-md'
            >
              <div>
                <h3 className='text-lg font-semibold text-monkey-text mb-2'>
                  Preferências de notificação
                </h3>
                <p className='text-monkey-muted text-sm mb-4'>
                  Escolha como deseja receber atualizações sobre suas finanças
                </p>
              </div>

              <div className='space-y-4'>
                {[
                  {
                    key: 'emailNotifications',
                    label: 'Notificações por e-mail',
                    description: 'Receba alertas e relatórios por e-mail',
                  },
                  {
                    key: 'pushNotifications',
                    label: 'Notificações push',
                    description: 'Receba notificações no navegador',
                  },
                  {
                    key: 'weeklyReport',
                    label: 'Relatório semanal',
                    description: 'Resumo semanal das suas finanças',
                  },
                  {
                    key: 'monthlyReport',
                    label: 'Relatório mensal',
                    description: 'Resumo mensal detalhado',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className='flex items-center justify-between'
                  >
                    <div>
                      <p className='font-medium text-monkey-text'>
                        {item.label}
                      </p>
                      <p className='text-sm text-monkey-muted'>
                        {item.description}
                      </p>
                    </div>
                    <label className='relative inline-flex items-center cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={notifications[item.key]}
                        onChange={(e) =>
                          handleNotificationChange(item.key, e.target.checked)
                        }
                        className='sr-only peer'
                      />
                      <div className="w-11 h-6 bg-monkey-muted/30 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-monkey-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-monkey-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'danger' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-6 max-w-md'
            >
              <div className='p-4 bg-monkey-danger/10 border border-monkey-danger/20 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-monkey-danger/20 rounded-lg flex items-center justify-center'>
                    <AlertCircle className='w-5 h-5 text-monkey-danger' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-monkey-text'>
                      Zona de perigo
                    </h3>
                    <p className='text-sm text-monkey-muted'>
                      Ações irreversíveis que podem resultar na perda permanente
                      de dados
                    </p>
                  </div>
                </div>
              </div>

              <div className='border-t border-monkey-muted/30 pt-6'>
                <h4 className='font-medium text-monkey-text mb-4'>
                  Excluir conta
                </h4>
                <p className='text-monkey-muted text-sm mb-4'>
                  Ao excluir sua conta, todos os seus dados (transações,
                  categorias, preferências) serão permanentemente removidos e
                  não poderão ser recuperados.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className='w-full py-3 px-4 rounded-lg bg-monkey-danger/10 border border-monkey-danger/30 text-monkey-danger font-medium hover:bg-monkey-danger/20 transition-colors flex items-center justify-center gap-2'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className='w-5 h-5' />
                      Excluir minha conta permanentemente
                    </>
                  )}
                </motion.button>
              </div>

              <div className='border-t border-monkey-muted/30 pt-6'>
                <h4 className='font-medium text-monkey-text mb-4'>
                  Sair da conta
                </h4>
                <p className='text-monkey-muted text-sm mb-4'>
                  Encerre sua sessão atual. Você precisará fazer login novamente
                  para acessar sua conta.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSignOut}
                  disabled={loading}
                  className='w-full py-3 px-4 rounded-lg bg-monkey-card border border-monkey-muted/30 text-monkey-text font-medium hover:bg-monkey-muted/10 transition-colors flex items-center justify-center gap-2'
                >
                  {loading ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Saindo...
                    </>
                  ) : (
                    <>
                      <LogOut className='w-5 h-5' />
                      Sair da conta
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
