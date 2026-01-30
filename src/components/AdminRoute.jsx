import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from './Layout';
import Loader from './Loader';

const AdminRoute = ({ children }) => {
  const auth = useAuth();
  
  // Handle case where context might not be fully initialized
  if (!auth) {
    return <Loader />;
  }

  const { isAuthenticated, loading, user } = auth;

  if (loading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default AdminRoute;

