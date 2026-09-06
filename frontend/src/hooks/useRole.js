import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useRole = () => {
  const { role, token } = useContext(AuthContext);

  const isAuthenticated = !!token;
  const isAdmin = role === 'Admin' || role === 'Authority';
  const isFieldOfficer = role === 'Field Officer';
  const isPublic = role === 'Public' || !role;

  return {
    role,
    isAuthenticated,
    isAdmin,
    isFieldOfficer,
    isPublic
  };
};
