import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import RepositoryDetail from './pages/RepositoryDetail';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';
import LoadingSpinner from './components/LoadingSpinner';
import BackendError from './components/BackendError';

function App() {
  const { user, isLoading, error } = useAuth();

  // Check if error is a connection error
  const isConnectionError = error && (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ERR_NETWORK' ||
    error.message?.includes('timeout') ||
    error.message?.includes('Network Error') ||
    (error.response === undefined && error.request !== undefined)
  );

  if (isConnectionError) {
    return <BackendError onRetry={() => window.location.reload()} />;
  }

  if (isLoading) {
    // Show loading for max 10 seconds, then show error
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      
      <Route element={<Layout />}>
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/" />} 
        />
        <Route 
          path="/repository/:id" 
          element={user ? <RepositoryDetail /> : <Navigate to="/" />} 
        />
        <Route 
          path="/tasks" 
          element={user ? <TasksPage /> : <Navigate to="/" />} 
        />
        <Route 
          path="/settings" 
          element={user ? <SettingsPage /> : <Navigate to="/" />} 
        />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
