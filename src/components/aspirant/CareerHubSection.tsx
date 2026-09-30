import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, GraduationCap, Sparkles, Briefcase, Target, Bell, ArrowRight, Loader2, MapPin, Mail, Phone, Cake,
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
  const { refreshProfile } = useAuth();

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

    return (
      <section className="py-10 bg-slate-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Welcome to JobCharcha
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold">Let's set up your profile</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              A few required details so employers can find and shortlist you. You can refine everything later from your Career Hub.
            </p>
          </div>

          <ProfileCompletionMeter score={profile.completionScore} checklist={profile.completionChecklist} />

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-6">
            <SetupBlock icon={User} title="Personal details">
              <PersonalInfoFields value={personal} onChange={setPersonal} email={profile.email} photoUrl={profile.photoUrl} onPhotoUploaded={() => onRefetch()} showPhoto={false} />
            </SetupBlock>
            <SetupBlock icon={GraduationCap} title="Education">
              <EducationFields value={education} onChange={setEducation} />
            </SetupBlock>
            <SetupBlock icon={Sparkles} title="Skills">
              <SkillsFields value={skills} onChange={setSkills} />
            </SetupBlock>
            <SetupBlock icon={Target} title="Job preferences">
              <JobPreferencesFields value={preferences} onChange={setPreferences} />
            </SetupBlock>

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">{error}</div>}

            <button
              onClick={submitSetup}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl cursor-pointer inline-flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save & continue to dashboard'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ---------------- FULL MODE (Career Hub) ----------------
  const p = profile;

  return (
    <section className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Overview */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-slate-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 truncate">{p.fullName || 'Your name'}</h1>
            {p.headline && <p className="text-xs sm:text-sm text-slate-500 font-semibold">{p.headline}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>
              {p.mobile && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {p.mobile}</span>}
              {(p.city || p.district) && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {[p.city, p.district, p.state].filter(Boolean).join(', ')}</span>}
              {p.dateOfBirth && <span className="inline-flex items-center gap-1"><Cake className="w-3 h-3" /> {new Date(p.dateOfBirth).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>

        <ProfileCompletionMeter score={p.completionScore} checklist={p.completionChecklist} onJump={jump} />

        {error && editing && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">{error}</div>
        )}

        {/* Personal */}
        <SectionCard
          id="section-personal" icon={User} title="Personal Information"
          editing={editing === 'personal'} saving={saving}
          onEdit={() => beginEdit('personal')} onCancel={cancelEdit}
          onSave={() => save(personalPayload(personal))}
          summary={
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
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
          id="section-education" icon={GraduationCap} title="Education"
          editing={editing === 'education'} saving={saving}
          onEdit={() => beginEdit('education')} onCancel={cancelEdit}
          onSave={() => save({ education })}
          summary={
            p.education.length ? (
              <ul className="space-y-2">
                {p.education.map((e, i) => (
                  <li key={i} className="flex flex-col">
                    <span className="font-bold text-slate-800">{[e.courseDegree, e.specialization].filter(Boolean).join(' — ') || e.qualification}</span>
                    <span className="text-[11px] text-slate-500">{[e.universityBoard, e.passingYear, e.percentageCgpa].filter(Boolean).join(' · ')}</span>
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
          id="section-skills" icon={Sparkles} title="Skills"
          editing={editing === 'skills'} saving={saving}
          onEdit={() => beginEdit('skills')} onCancel={cancelEdit}
          onSave={() => save({ skills })}
          summary={
            skillList.length ? (
              <div className="flex flex-wrap gap-2">
                {skillList.map((s, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold">{s}</span>
                ))}
              </div>
            ) : <Empty text="No skills added yet." />
          }
        >
          <SkillsFields value={skills} onChange={setSkills} />
        </SectionCard>

        {/* Work experience */}
        <SectionCard
          id="section-experience" icon={Briefcase} title="Work Experience"
          editing={editing === 'experience'} saving={saving}
          onEdit={() => beginEdit('experience')} onCancel={cancelEdit}
          onSave={() => save({ workExperience: experience })}
          summary={
            p.workExperience.length ? (
              <ul className="space-y-2">
                {p.workExperience.map((w, i) => (
                  <li key={i} className="flex flex-col">
                    <span className="font-bold text-slate-800">{w.jobTitle} · {w.company}</span>
                    <span className="text-[11px] text-slate-500">{w.startDate}{' – '}{w.isCurrent ? 'Present' : w.endDate}</span>
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
          id="section-preferences" icon={Target} title="Job Preferences"
          editing={editing === 'preferences'} saving={saving}
          onEdit={() => beginEdit('preferences')} onCancel={cancelEdit}
          onSave={() => save({ preferences })}
          summary={
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
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

        {/* Job alerts — phase-2 placeholder link */}
        <button
          onClick={() => navigate('/job-alerts')}
          className="w-full bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between gap-3 hover:border-emerald-300 cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Bell className="w-4 h-4" /></div>
            <div>
              <p className="font-heading font-extrabold text-sm text-slate-900">Job Alerts</p>
              <p className="text-[11px] text-slate-500">Get notified about matching jobs by email.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">Manage <ArrowRight className="w-3.5 h-3.5" /></span>
        </button>
      </div>
    </section>
  );
};

const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <dt className="text-[10px] font-bold text-slate-400 uppercase">{label}</dt>
    <dd className="text-xs font-semibold text-slate-700">{value || '—'}</dd>
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-400 font-medium">{text}</p>
);

const SetupBlock: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-slate-900">
      <Icon className="w-4 h-4 text-emerald-600" />
      <h3 className="font-heading font-extrabold text-sm">{title}</h3>
    </div>
    {children}
  </div>
);
