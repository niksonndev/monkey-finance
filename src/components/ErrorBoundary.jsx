import { Component } from 'react';

/**
 * Error Boundary global: captura erros de renderização e exibe uma
 * mensagem amigável com opção de recarregar, em vez de tela branca.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erro não tratado na aplicação:', error, errorInfo);
  }

  handleReload = () => {
    // BASE_URL do Vite: o app pode estar numa subpasta (GitHub Pages), então
    // um '/dashboard' absoluto cairia fora do app.
    window.location.href = `${import.meta.env.BASE_URL}dashboard`;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen bg-monkey-bg flex items-center justify-center p-4'>
          <div className='card max-w-md text-center'>
            <h1 className='text-2xl font-bold text-monkey-text mb-2'>
              Algo deu errado
            </h1>
            <p className='text-monkey-muted text-sm mb-6'>
              Ocorreu um erro inesperado ao renderizar a página. Tente
              recarregar — se o problema persistir, entre em contato com o
              suporte.
            </p>
            <button onClick={this.handleReload} className='btn-primary w-full'>
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
