import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CareerHubSection } from './CareerHubSection';
import { getAspirantProfile, AspirantProfile } from '../../api/aspirantProfile';

/** Career Hub rendered as a dashboard tab (full mode only — the first-login setup flow
 *  lives on its own route so it can drop the tab chrome). */
export const CareerHubTab: React.FC = () => {
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-sm font-bold text-slate-800">Couldn't load your profile.</p>
        <button onClick={() => { setLoading(true); load(); }} className="bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl">
          Retry
        </button>
      </div>
    );
  }

  return (
    <CareerHubSection profile={profile} onProfile={setProfile} onRefetch={load} mode="full" />
  );
};
