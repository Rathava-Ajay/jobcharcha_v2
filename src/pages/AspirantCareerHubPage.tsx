import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { CareerHubSection } from '../components/aspirant/CareerHubSection';
import { getAspirantProfile, AspirantProfile } from '../api/aspirantProfile';
import { useAuth } from '../context/AuthContext';

/**
 * Dedicated route for the first-login profile setup flow (`?setup=1`). The normal Career Hub
 * is a tab inside AspirantDashboardPage — anyone landing here otherwise is sent there.
 */
export default function AspirantCareerHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setupParam = searchParams.get('setup') === '1';

  const [profile, setProfile] = useState<AspirantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setProfile(await getAspirantProfile());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;
  if (!setupParam) return <Navigate to="/dashboard/aspirant?tab=career" replace />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-sm font-bold text-slate-800">Couldn't load your profile.</p>
        <button onClick={() => { setLoading(true); load(); }} className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">
          Retry
        </button>
      </div>
    );
  }

  // Setup already done (e.g. refresh after completing) — no reason to stay on the bare flow.
  if (!profile.needsSetup) return <Navigate to="/dashboard/aspirant?tab=career" replace />;

  return (
    <CareerHubSection
      profile={profile}
      onProfile={setProfile}
      onRefetch={load}
      mode="setup"
      onSetupDone={() => navigate('/dashboard/aspirant?tab=career', { replace: true })}
    />
  );
}
