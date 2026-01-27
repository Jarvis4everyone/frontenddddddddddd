import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from './Layout';
import Loader from './Loader';

const ProtectedRoute = ({ children }) => {
  const auth = useAuth();
  
  // Handle case where context might not be fully initialized
  if (!auth) {
    return <Loader />;
  }

  const { isAuthenticated, loading } = auth;

  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;

