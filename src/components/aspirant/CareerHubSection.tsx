import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, GraduationCap, Sparkles, Briefcase, Target, Bell, ArrowRight, Loader2, MapPin, Mail, Phone, Cake,
  FileText, CheckCircle2, LogOut, AlertCircle,
} from 'lucide-react';
import {
  AspirantProfile, UpsertAspirantProfilePayload, updateAspirantProfile,
  EducationEntry, WorkExperienceEntry, JobPreferences, SkillsBlock, emptySkills, emptyPreferences,
} from '../../api/aspirantProfile';
import { useAuth } from '../../context/AuthContext';
import { SectionCard } from './SectionCard';
import { ProfileCompletionMeter } from './ProfileCompletionMeter';
import { PersonalInfoFields, PersonalDraft } from './PersonalInfoFields';
import { EducationFields } from './EducationFields';
import { SkillsFields } from './SkillsFields';
import { WorkExperienceFields } from './WorkExperienceFields';
import { JobPreferencesFields } from './JobPreferencesFields';
import { MasterResumePanel } from './MasterResumePanel';
import { Logo } from '../brand/Logo';

interface Props {
  profile: AspirantProfile;
  onProfile: (p: AspirantProfile) => void;
  onRefetch: () => Promise<void>;
  mode?: 'full' | 'setup';
  onSetupDone?: () => void;
}

type SectionKey = 'personal' | 'education' | 'skills' | 'experience' | 'preferences';

const toPersonalDraft = (p: AspirantProfile): PersonalDraft => ({
  firstName: p.firstName || '',
  lastName: p.lastName || '',
  mobile: p.mobile || '',
  dateOfBirth: p.dateOfBirth || '',
  gender: p.gender || '',
  city: p.city || '',
  district: p.district || '',
  state: p.state || '',
  aboutMe: p.aboutMe || '',
  headline: p.headline || '',
});

const personalPayload = (d: PersonalDraft): UpsertAspirantProfilePayload => ({ ...d });

// completion-checklist key -> DOM id to scroll to
const KEY_TO_SECTION: Record<string, string> = {
  name: 'section-personal', mobile: 'section-personal', dob: 'section-personal',
  gender: 'section-personal', location: 'section-personal', photo: 'section-personal', about: 'section-personal',
  education: 'section-education', skills: 'section-skills', experience: 'section-experience',
  preferences: 'section-preferences', resume: 'section-resume',
};

export const CareerHubSection: React.FC<Props> = ({ profile, onProfile, onRefetch, mode = 'full', onSetupDone }) => {
  const navigate = useNavigate();
  const { refreshProfile, logout } = useAuth();

  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // drafts
  const [personal, setPersonal] = useState<PersonalDraft>(() => toPersonalDraft(profile));
  const [education, setEducation] = useState<EducationEntry[]>(() => profile.education);
  const [skills, setSkills] = useState<SkillsBlock>(() => profile.skills || emptySkills());
  const [experience, setExperience] = useState<WorkExperienceEntry[]>(() => profile.workExperience);
  const [preferences, setPreferences] = useState<JobPreferences>(() => profile.preferences || emptyPreferences());

  // Hook must run unconditionally — this component is reused (not remounted) when it flips
  // from setup mode to full mode after the first-login gate releases.
  const skillList = useMemo(
    () => [...profile.skills.technical, ...profile.skills.computer, ...profile.skills.languages, ...profile.skills.other],
    [profile.skills],
  );

  const resetDrafts = (p: AspirantProfile) => {
    setPersonal(toPersonalDraft(p));
    setEducation(p.education);
    setSkills(p.skills || emptySkills());
    setExperience(p.workExperience);
    setPreferences(p.preferences || emptyPreferences());
  };

  const beginEdit = (k: SectionKey) => { resetDrafts(profile); setError(null); setEditing(k); };
  const cancelEdit = () => { resetDrafts(profile); setEditing(null); setError(null); };

  const save = async (payload: UpsertAspirantProfilePayload) => {
    setSaving(true); setError(null);
    try {
      const updated = await updateAspirantProfile(payload);
      onProfile(updated);
      resetDrafts(updated);
      setEditing(null);
      if (updated.needsSetup === false) refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const jump = (checklistKey: string) => {
    const id = KEY_TO_SECTION[checklistKey];
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ---------------- SETUP MODE (first-login) ----------------
  if (mode === 'setup') {
    const submitSetup = async () => {
      setSaving(true); setError(null);
      try {
        const updated = await updateAspirantProfile({
          ...personal, education, skills, workExperience: experience, preferences,
        });
        onProfile(updated);
        if (updated.needsSetup) {
          setError('A few required fields are still missing — check the highlighted checklist above and try again.');
          setSaving(false);
          return;
        }
        await refreshProfile();
        onSetupDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save. Please try again.');
        setSaving(false);
      }
    };

    const steps: { icon: React.ElementType; title: string; hint: string; body: React.ReactNode }[] = [
      { icon: User, title: 'Personal details', hint: 'Name, mobile, date of birth and where you live', body: <PersonalInfoFields value={personal} onChange={setPersonal} email={profile.email} photoUrl={profile.photoUrl} onPhotoUploaded={() => onRefetch()} showPhoto={false} /> },
      { icon: GraduationCap, title: 'Education', hint: 'Your highest qualification decides which jobs you can apply for', body: <EducationFields value={education} onChange={setEducation} /> },
      { icon: Sparkles, title: 'Skills', hint: 'Computer, language and technical skills', body: <SkillsFields value={skills} onChange={setSkills} /> },
      { icon: Target, title: 'Job preferences', hint: 'Job type, work mode and preferred locations', body: <JobPreferencesFields value={preferences} onChange={setPreferences} /> },
    ];

    return (
      <div className="min-h-screen bg-[#f3f6fb]">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
            <Link to="/" aria-label="JobCharcha home"><Logo className="text-[20px] sm:text-[23px]" /></Link>
            <span className="hidden sm:inline text-[13px] font-semibold text-slate-400">· Profile setup</span>
            <span className="ml-auto hidden sm:block text-[13px] font-semibold text-slate-600 truncate max-w-[12rem]">{profile.fullName || profile.email}</span>
            <button type="button" onClick={() => { navigate('/', { replace: true }); void logout(); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 px-3 py-2 text-[13px] font-bold text-slate-600 cursor-pointer max-sm:ml-auto">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 pb-28">
          <div className="relative overflow-hidden rounded-3xl text-white p-5 sm:p-7 bg-[radial-gradient(520px_260px_at_100%_0%,rgba(56,189,248,0.45),transparent_60%),linear-gradient(135deg,#172554,#1e40af_55%,#2563eb)]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[12px] font-bold text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Welcome to JobCharcha
            </span>
            <h1 className="mt-3 text-[24px] sm:text-[30px] leading-tight font-extrabold tracking-tight">Let's set up your profile</h1>
            <p className="mt-1 text-[14px] text-blue-100 max-w-xl">Four quick steps so we can match the right jobs and employers can shortlist you. You can change everything later.</p>
            <ol className="mt-4 flex flex-wrap gap-2">
              {steps.map((st, i) => (
                <li key={st.title}>
                  <a href={`#setup-step-${i + 1}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 pl-1 pr-3 py-1 text-[12.5px] font-bold">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 grid place-items-center text-[12px] font-black">{i + 1}</span>{st.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          <ProfileCompletionMeter score={profile.completionScore} checklist={profile.completionChecklist} />

          {steps.map((st, i) => (
            <section key={st.title} id={`setup-step-${i + 1}`} className="bg-white rounded-2xl border border-slate-200 overflow-hidden scroll-mt-24">
              <header className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100">
                <span className="w-9 h-9 rounded-full bg-blue-700 text-white grid place-items-center text-[14px] font-black shrink-0">{i + 1}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-extrabold text-[16px] text-slate-900"><st.icon className="w-4 h-4 text-blue-600" />{st.title}</span>
                  <span className="block text-[12.5px] text-slate-500">{st.hint}</span>
                </span>
              </header>
              <div className="p-4 sm:p-5">{st.body}</div>
            </section>
          ))}

          {error && <div role="alert" className="flex gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold rounded-xl px-3.5 py-3"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <p className="hidden sm:block flex-1 text-[13px] text-slate-500">Required fields are marked in the checklist above.</p>
            <button
              type="button"
              onClick={submitSetup}
              disabled={saving}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-60 text-white font-extrabold text-[15px] px-7 py-3.5 rounded-xl cursor-pointer inline-flex items-center justify-center gap-2 shadow-[0_12px_24px_-12px_rgba(37,99,235,0.8)]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save & go to my dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- FULL MODE (Career Hub) ----------------
  const p = profile;

  const sectionDone = (sectionId: string) => p.completionChecklist
    .filter((c) => KEY_TO_SECTION[c.key] === sectionId)
    .every((c) => c.done);
  const statusOf = (sectionId: string): 'done' | 'todo' | undefined =>
    p.completionChecklist.some((c) => KEY_TO_SECTION[c.key] === sectionId) ? (sectionDone(sectionId) ? 'done' : 'todo') : undefined;
  const NAV: { id: string; label: string; icon: React.ElementType }[] = [
    { id: 'section-personal', label: 'Personal', icon: User },
    { id: 'section-education', label: 'Education', icon: GraduationCap },
    { id: 'section-skills', label: 'Skills', icon: Sparkles },
    { id: 'section-experience', label: 'Experience', icon: Briefcase },
    { id: 'section-preferences', label: 'Preferences', icon: Target },
    { id: 'section-resume', label: 'Résumé', icon: FileText },
  ];
  const initialsOf = (p.fullName || p.email || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-[1280px]">
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
        <aside className="space-y-4 lg:sticky lg:top-24 min-w-0">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="h-20 bg-[radial-gradient(300px_120px_at_100%_0%,rgba(56,189,248,0.5),transparent_60%),linear-gradient(135deg,#172554,#1e40af_60%,#2563eb)]" />
            <div className="px-4 pb-4 -mt-10">
              <div className="w-20 h-20 rounded-2xl ring-4 ring-white bg-gradient-to-br from-amber-300 to-orange-500 overflow-hidden grid place-items-center text-slate-900 text-[22px] font-black shadow">
                {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : initialsOf}
              </div>
              <h1 className="mt-2.5 text-[19px] font-extrabold text-slate-900 leading-tight break-words">{p.fullName || 'Your name'}</h1>
              {p.headline && <p className="text-[13px] text-slate-500 font-semibold break-words">{p.headline}</p>}
              <ul className="mt-3 space-y-1.5 text-[13px] text-slate-600">
                <li className="flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 shrink-0 text-slate-400" /><span className="truncate">{p.email}</span></li>
                {p.mobile && <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0 text-slate-400" />{p.mobile}</li>}
                {(p.city || p.district) && <li className="flex items-center gap-2 min-w-0"><MapPin className="w-4 h-4 shrink-0 text-slate-400" /><span className="truncate">{[p.city, p.district, p.state].filter(Boolean).join(', ')}</span></li>}
                {p.dateOfBirth && <li className="flex items-center gap-2"><Cake className="w-4 h-4 shrink-0 text-slate-400" />{new Date(p.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</li>}
              </ul>
            </div>
          </div>

          <ProfileCompletionMeter score={p.completionScore} checklist={p.completionChecklist} onJump={jump} />

          <nav aria-label="Profile sections" className="hidden lg:block bg-white rounded-2xl border border-slate-200 p-2">
            {NAV.map((n) => {
              const st = statusOf(n.id);
              return (
                <button key={n.id} type="button" onClick={() => go(n.id)}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <n.icon className="w-4 h-4 text-slate-400" />
                  <span className="flex-1 text-left">{n.label}</span>
                  {st === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {st === 'todo' && <span className="w-2 h-2 rounded-full bg-amber-400" aria-label="Needs info" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-4 min-w-0">
          <div className="lg:hidden flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
            {NAV.map((n) => (
              <button key={n.id} type="button" onClick={() => go(n.id)} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[12.5px] font-bold text-slate-700 cursor-pointer">
                <n.icon className="w-3.5 h-3.5 text-slate-400" />{n.label}
                {statusOf(n.id) === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
            ))}
          </div>

        {error && editing && (
          <div role="alert" className="flex gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-semibold rounded-xl px-3.5 py-3"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>
        )}

        {/* Personal */}
        <SectionCard
          id="section-personal" status={statusOf('section-personal')} icon={User} title="Personal Information"
          editing={editing === 'personal'} saving={saving}
          onEdit={() => beginEdit('personal')} onCancel={cancelEdit}
          onSave={() => save(personalPayload(personal))}
          summary={
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Row label="Full name" value={p.fullName} />
              <Row label="Mobile" value={p.mobile} />
              <Row label="Date of birth" value={p.dateOfBirth && new Date(p.dateOfBirth).toLocaleDateString()} />
              <Row label="Gender" value={p.gender} />
              <Row label="Location" value={[p.city, p.district, p.state].filter(Boolean).join(', ')} />
              <Row label="Headline" value={p.headline} />
              {p.aboutMe && <div className="sm:col-span-2"><Row label="About" value={p.aboutMe} /></div>}
            </dl>
          }
        >
          <PersonalInfoFields value={personal} onChange={setPersonal} email={p.email} photoUrl={p.photoUrl} onPhotoUploaded={() => onRefetch()} />
        </SectionCard>

        {/* Education */}
        <SectionCard
          id="section-education" status={statusOf('section-education')} icon={GraduationCap} title="Education"
          editing={editing === 'education'} saving={saving}
          onEdit={() => beginEdit('education')} onCancel={cancelEdit}
          onSave={() => save({ education })}
          summary={
            p.education.length ? (
              <ul className="space-y-2">
                {p.education.map((e, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <GraduationCap className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-800 break-words">{[e.courseDegree, e.specialization].filter(Boolean).join(' — ') || e.qualification}</span>
                      <span className="block text-[12.5px] text-slate-500">{[e.universityBoard, e.passingYear, e.percentageCgpa].filter(Boolean).join(' · ')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <Empty text="No education added yet." />
          }
        >
          <EducationFields value={education} onChange={setEducation} />
        </SectionCard>

        {/* Skills */}
        <SectionCard
          id="section-skills" status={statusOf('section-skills')} icon={Sparkles} title="Skills"
          editing={editing === 'skills'} saving={saving}
          onEdit={() => beginEdit('skills')} onCancel={cancelEdit}
          onSave={() => save({ skills })}
          summary={
            skillList.length ? (
              <div className="flex flex-wrap gap-2">
                {skillList.map((s, i) => (
                  <span key={i} className="bg-blue-50 text-blue-800 border border-blue-100 px-3 py-1 rounded-full text-[12.5px] font-bold">{s}</span>
                ))}
              </div>
            ) : <Empty text="No skills added yet." />
          }
        >
          <SkillsFields value={skills} onChange={setSkills} />
        </SectionCard>

        {/* Work experience */}
        <SectionCard
          id="section-experience" status={statusOf('section-experience')} icon={Briefcase} title="Work Experience"
          editing={editing === 'experience'} saving={saving}
          onEdit={() => beginEdit('experience')} onCancel={cancelEdit}
          onSave={() => save({ workExperience: experience })}
          summary={
            p.workExperience.length ? (
              <ul className="space-y-2">
                {p.workExperience.map((w, i) => (
                  <li key={i} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <Briefcase className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block font-bold text-slate-800 break-words">{w.jobTitle} · {w.company}</span>
                      <span className="block text-[12.5px] text-slate-500">{w.startDate}{' – '}{w.isCurrent ? 'Present' : w.endDate}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <Empty text="No work experience — that's fine for a fresher." />
          }
        >
          <WorkExperienceFields value={experience} onChange={setExperience} />
        </SectionCard>

        {/* Job preferences */}
        <SectionCard
          id="section-preferences" status={statusOf('section-preferences')} icon={Target} title="Job Preferences"
          editing={editing === 'preferences'} saving={saving}
          onEdit={() => beginEdit('preferences')} onCancel={cancelEdit}
          onSave={() => save({ preferences })}
          summary={
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Row label="Job type" value={p.preferences.preferredJobType} />
              <Row label="Work mode" value={p.preferences.workMode} />
              <Row label="Expected salary" value={p.preferences.expectedSalary} />
              <Row label="Industry" value={p.preferences.preferredIndustry} />
              <Row label="Locations" value={p.preferences.preferredLocations.join(', ')} />
              <Row label="Open to relocate" value={p.preferences.willingToRelocate ? 'Yes' : 'No'} />
            </dl>
          }
        >
          <JobPreferencesFields value={preferences} onChange={setPreferences} />
        </SectionCard>

        {/* Master résumé */}
        <MasterResumePanel
          resumeUrl={p.resumeUrl}
          resumeFileName={p.resumeFileName}
          resumeUploadedAt={p.resumeUploadedAt}
          onChanged={onRefetch}
        />

        <button
          type="button"
          onClick={() => navigate('/job-alerts')}
          className="w-full rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 text-left text-white cursor-pointer bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center shrink-0"><Bell className="w-5 h-5" /></span>
            <span className="min-w-0">
              <span className="block font-extrabold text-[15px]">Job alerts</span>
              <span className="block text-[12.5px] text-blue-100">Get matching jobs by email the day they are posted</span>
            </span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-white text-blue-800 px-3 py-2 text-[13px] font-extrabold">Manage <ArrowRight className="w-4 h-4" /></span>
        </button>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
    <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</dt>
    <dd className={`mt-0.5 text-[14px] font-semibold break-words ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || 'Not added'}</dd>
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[13px] text-slate-500">{text}</p>
);
