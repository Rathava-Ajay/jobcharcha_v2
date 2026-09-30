import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../Navbar';

const ROLE_LABEL: Record<string, string> = {
  aspirant: 'Job seeker', employer: 'Employer', admin: 'Admin', superadmin: 'Super admin', user: 'Member',
};

/** Logged-in area chrome: the same site header as public pages, plus a slim account bar. */
export const DashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-3">
          <p className="text-[13px] text-slate-500 truncate">
            Signed in as <span className="font-bold text-slate-800">{user?.name}</span>
            {user?.role && <span className="ml-2 inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold">{ROLE_LABEL[user.role] ?? user.role}</span>}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
};
