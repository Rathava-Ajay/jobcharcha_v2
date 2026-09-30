import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const effectiveRole = user.role === 'superadmin' ? 'admin' : user.role;
  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={`/dashboard/${effectiveRole}`} replace />;
  }

  // First-login gate: an aspirant who has never completed their Career Hub profile is held on
  // the setup form until the required fields are saved (backend clears needsProfileSetup).
  if (
    effectiveRole === 'aspirant' &&
    user.needsProfileSetup &&
    !location.pathname.startsWith('/dashboard/aspirant/profile')
  ) {
    return <Navigate to="/dashboard/aspirant/profile?setup=1" replace />;
  }

  return children;
};
