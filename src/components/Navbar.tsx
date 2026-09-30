import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock } from 'lucide-react';
import { UserProfile } from '../types';
import { SectionNav } from './SectionNav';

interface NavbarProps {
  user: UserProfile | null;
  onOpenExamTracker?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenExamTracker,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAuthClick = () => {
    if (user) {
      navigate(`/dashboard/${user.role === 'superadmin' ? 'admin' : user.role}`);
    } else {
      navigate('/login');
    }
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80' : 'bg-white border-b border-slate-200/60'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">

          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center group cursor-pointer shrink-0">
            <img
              src="/icons/jobcharcha_logo_transparent.png"
              alt="JobCharcha"
              width={570}
              height={100}
              fetchPriority="high"
              className="h-7 sm:h-8 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </button>

          {/* Section Nav — beside the logo, scrolls horizontally if it overflows */}
          <div className="flex-1 min-w-0">
            <SectionNav />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenExamTracker}
              className="hidden lg:flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Personal Exam Date Tracker & Countdowns"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Exam Tracker</span>
            </button>

            {/* Single Login CTA — role selection happens after clicking Login */}
            <button
              onClick={handleAuthClick}
              aria-label={user ? `Open ${user.name.split(' ')[0]}'s account menu` : 'Login or register'}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <User className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">{user ? user.name.split(' ')[0] : 'Login'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
