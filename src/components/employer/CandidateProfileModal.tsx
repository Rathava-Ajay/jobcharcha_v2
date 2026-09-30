import React, { useEffect, useState } from 'react';
import { X, Loader2, MapPin, Briefcase, GraduationCap, IndianRupee, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { getCandidateProfile } from '../../api/employerCandidates';
import { CandidateProfile } from '../../types';
import { ContactActionFlow } from './ContactActionFlow';

interface CandidateProfileModalProps {
  candidateUserId: string;
  onClose: () => void;
  onGoToBilling: () => void;
  onContacted: () => void;
}

export const CandidateProfileModal: React.FC<CandidateProfileModalProps> = ({ candidateUserId, onClose, onGoToBilling, onContacted }) => {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCandidateProfile(candidateUserId).then((p) => {
      if (!cancelled) setProfile(p);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [candidateUserId]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !profile ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-heading font-extrabold text-slate-900">{profile.name}</h2>
                {profile.headline && <p className="text-xs text-slate-500 font-semibold mt-0.5">{profile.headline}</p>}
                {profile.isAlreadyContacted && (
                  <span className="inline-flex items-center gap-1 mt-2 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Already Contacted
                  </span>
                )}
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {profile.aboutMe && <p className="text-xs text-slate-600 font-medium leading-relaxed">{profile.aboutMe}</p>}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div><span className="text-slate-400 font-bold block text-[10px] uppercase">Experience</span><span className="font-bold text-slate-800">{profile.experienceYears} yrs</span></div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div><span className="text-slate-400 font-bold block text-[10px] uppercase">City</span><span className="font-bold text-slate-800">{profile.currentCity || 'Not specified'}</span></div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div><span className="text-slate-400 font-bold block text-[10px] uppercase">Expected Salary</span><span className="font-bold text-slate-800">{profile.expectedSalary ? `₹${profile.expectedSalary.toLocaleString('en-IN')}` : 'Not specified'}</span></div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div><span className="text-slate-400 font-bold block text-[10px] uppercase">Notice Period</span><span className="font-bold text-slate-800">{profile.noticePeriodDays} days</span></div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2 col-span-2">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div><span className="text-slate-400 font-bold block text-[10px] uppercase">Education</span><span className="font-bold text-slate-800">{profile.education || 'Not specified'}</span></div>
              </div>
            </div>

            {profile.skills && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-md">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.resumeUrl && (
              <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline">
                <FileText className="w-3.5 h-3.5" /> View Resume
              </a>
            )}

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Contact Candidate</span>
              <ContactActionFlow
                candidateUserId={profile.userId}
                candidateName={profile.name}
                onGoToBilling={onGoToBilling}
                onUnlocked={onContacted}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
