import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SectionNav } from '../SectionNav';

export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-white flex items-center justify-center font-heading font-black text-lg">
              J
            </div>
            <span className="text-lg font-heading font-extrabold tracking-tight text-slate-900">
              Job<span className="text-emerald-600">Charcha</span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-semibold text-slate-500">
              {user?.name} <span className="text-slate-300">•</span> <span className="uppercase text-emerald-700 font-bold">{user?.role}</span>
            </span>
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              title="Go to homepage"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-600 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <SectionNav className="py-2.5" />
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
};
