import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Layout from './components/Layout';
import InstallPrompt from './components/InstallPrompt';

// Code splitting: cada página é carregada sob demanda
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-monkey-bg'>
      <div className='animate-spin rounded-full h-12 w-12 border-4 border-monkey-primary border-t-transparent'></div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-monkey-bg'>
        <div className='animate-spin rounded-full h-12 w-12 border-4 border-monkey-primary border-t-transparent'></div>
      </div>
    );
  }

  return user ? children : <Navigate to='/login' replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-monkey-bg'>
        <div className='animate-spin rounded-full h-12 w-12 border-4 border-monkey-primary border-t-transparent'></div>
      </div>
    );
  }

  return user ? <Navigate to='/dashboard' replace /> : children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route
        path='/login'
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/transactions' element={<Transactions />} />
        <Route path='/settings' element={<Settings />} />
      </Route>
      <Route path='/' element={<Navigate to='/dashboard' replace />} />
      <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        {/* Fora das rotas de propósito: a sugestão de instalação aparece já na
            abertura do app (inclusive na tela de login), que é onde a pessoa
            decide se quer o Monkey Finance na tela inicial. */}
        <InstallPrompt />
        <AppRoutes />
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
