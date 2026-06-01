import React from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return null;
  if (!user) return <div>Faça login para continuar.</div>;
  return children;
}


