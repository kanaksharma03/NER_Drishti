import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../hooks/useRole';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useRole();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
