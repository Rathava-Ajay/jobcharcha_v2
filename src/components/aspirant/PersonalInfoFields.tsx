import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { uploadAvatar } from '../../api/auth';
import { fieldClass, labelClass } from './SectionCard';
import { Select } from '../ui/Select';

export interface PersonalDraft {
  firstName: string;
  lastName: string;
  mobile: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  district: string;
  state: string;
  aboutMe: string;
  headline: string;
}

interface Props {
  value: PersonalDraft;
  onChange: (next: PersonalDraft) => void;
  email: string;
  photoUrl?: string;
  /** Called after a successful avatar upload so the parent can refresh the auth user. */
  onPhotoUploaded?: (url: string) => void;
  showPhoto?: boolean;
}

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const PersonalInfoFields: React.FC<Props> = ({
  value, onChange, email, photoUrl, onPhotoUploaded, showPhoto = true,
}) => {
  const set = <K extends keyof PersonalDraft>(k: K, v: PersonalDraft[K]) => onChange({ ...value, [k]: v });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPhotoErr(null);
    try {
      const { url } = await uploadAvatar(file);
      onPhotoUploaded?.(url);
    } catch {
      setPhotoErr('Could not upload the photo. Use a JPG/PNG under 5 MB.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {showPhoto && (
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {photoUrl ? <img src={photoUrl} alt="" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <label className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-emerald-400 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl cursor-pointer">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={handlePhoto} />
            </label>
            {photoErr && <p className="text-[10px] text-rose-600 mt-1">{photoErr}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First name *</label>
          <input className={fieldClass} value={value.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Last name *</label>
          <input className={fieldClass} value={value.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={`${fieldClass} opacity-70`} value={email} readOnly />
        </div>
        <div>
          <label className={labelClass}>Mobile number *</label>
          <input className={fieldClass} value={value.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="10-digit mobile" />
        </div>
        <div>
          <label className={labelClass}>Date of birth *</label>
          <input type="date" className={fieldClass} value={value.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Gender *</label>
          <Select className={fieldClass} value={value.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Select…</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </div>
        <div>
          <label className={labelClass}>City *</label>
          <input className={fieldClass} value={value.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>District *</label>
          <input className={fieldClass} value={value.district} onChange={(e) => set('district', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>State</label>
          <input className={fieldClass} value={value.state} onChange={(e) => set('state', e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Headline</label>
          <input className={fieldClass} value={value.headline} onChange={(e) => set('headline', e.target.value)} placeholder="e.g. Final-year B.Tech (CSE) · aspiring data analyst" />
        </div>
      </div>

      <div>
        <label className={labelClass}>About me</label>
        <textarea rows={3} className={fieldClass} value={value.aboutMe} onChange={(e) => set('aboutMe', e.target.value)} placeholder="A short summary employers see first." />
      </div>
    </div>
  );
};
