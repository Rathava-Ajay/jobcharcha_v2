import React, { useEffect, useState } from 'react';
import { Search, Loader2, MapPin, Briefcase, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { searchCandidates, CandidateSearchParams } from '../../api/employerCandidates';
import { CandidateListItem } from '../../types';
import { CandidateProfileModal } from './CandidateProfileModal';

interface CandidateSearchPanelProps {
  onGoToBilling: () => void;
}

export const CandidateSearchPanel: React.FC<CandidateSearchPanelProps> = ({ onGoToBilling }) => {
  const [filters, setFilters] = useState<CandidateSearchParams>({});
  const [skillsInput, setSkillsInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const runSearch = (params: CandidateSearchParams) => {
    setLoading(true);
    searchCandidates(params).then((res) => {
      setCandidates(res.items);
      setTotalCount(res.totalCount);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { runSearch({}); }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: CandidateSearchParams = { ...filters, skills: skillsInput || undefined, city: cityInput || undefined };
    setFilters(next);
    runSearch(next);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-heading font-extrabold text-slate-900">Find Candidates</h2>
        <p className="text-xs text-slate-500 mt-1">Search real candidate profiles. Contact details stay masked until you unlock a candidate.</p>
      </div>

      <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-bold">
        <input
          type="text" placeholder="Skills (e.g. React)" value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
        />
        <input
          type="text" placeholder="City" value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
        />
        <input
          type="number" placeholder="Min Experience (yrs)"
          value={filters.minExperience ?? ''}
          onChange={(e) => setFilters({ ...filters, minExperience: e.target.value ? Number(e.target.value) : undefined })}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
        />
        <input
          type="text" placeholder="Education (e.g. B.Tech)"
          value={filters.education ?? ''}
          onChange={(e) => setFilters({ ...filters, education: e.target.value || undefined })}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
        />
        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2">
          <Search className="w-3.5 h-3.5" /> Search
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-emerald-600 animate-spin" /></div>
      ) : candidates.length === 0 ? (
        <p className="text-xs text-slate-500 font-semibold text-center py-10">No candidates match these filters.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-400 font-bold">{totalCount} candidate{totalCount === 1 ? '' : 's'} found</p>
          {candidates.map((c) => (
            <div key={c.userId} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-sm text-slate-900">{c.name}</h3>
                  {c.isAlreadyContacted && (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Contacted
                    </span>
                  )}
                </div>
                {c.headline && <p className="text-xs text-slate-500 font-semibold">{c.headline}</p>}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {c.experienceYears} yrs</span>
                  {c.currentCity && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.currentCity}</span>}
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.maskedPhone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.maskedEmail}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidateId(c.userId)}
                className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer shrink-0"
              >
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedCandidateId && (
        <CandidateProfileModal
          candidateUserId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
          onGoToBilling={onGoToBilling}
          onContacted={() => runSearch(filters)}
        />
      )}
    </div>
  );
};
