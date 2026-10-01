import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Mail, MessageSquare, ShieldCheck, Sparkles, Loader2, Send } from 'lucide-react';
import { getCategories, ApiCategory } from '../api/categories';
import { subscribeAlerts } from '../api/alerts';
import { getSettings } from '../api/settings';
import { ApiError } from '../api/client';
import { trackEmailSignup, trackWhatsAppJoin } from '../utils/analytics';
import { Select } from './ui/Select';

interface JobAlertSubscriptionProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const JobAlertSubscription: React.FC<JobAlertSubscriptionProps> = ({ onClose, isModal = false }) => {
  const [email, setEmail] = useState('');
  const [categorySlots, setCategorySlots] = useState<string[]>(['', '', '']);
  const selectedCategories = categorySlots.filter(Boolean);
  const [selectedQualification, setSelectedQualification] = useState('Graduate');
  const [selectedRegion, setSelectedRegion] = useState('All India / Central');

  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<ApiCategory[]>([]);
  const [whatsAppChannelUrl, setWhatsAppChannelUrl] = useState<string | null>(null);
  const [telegramChannelUrl, setTelegramChannelUrl] = useState<string | null>(null);

  useEffect(() => {
    getCategories().then(setCategoriesList).catch(() => setCategoriesList([]));
    getSettings()
      .then((s) => {
        setWhatsAppChannelUrl(s.whatsAppChannelUrl || null);
        setTelegramChannelUrl(s.telegramChannelUrl || null);
      })
      .catch(() => {});
  }, []);

  const qualificationsList = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Engineering / B.Tech', 'Post Graduate'];
  const regionsList = ['All India / Central', 'Delhi NCR', 'Uttar Pradesh', 'Bihar', 'Maharashtra', 'Gujarat', 'South India'];

  const setCategorySlot = (index: number, value: string) => {
    setCategorySlots((slots) => slots.map((s, i) => (i === index ? value : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await subscribeAlerts({
        email,
        preferredCategories: selectedCategories,
        preferredRegion: selectedRegion,
        alertFrequency: 'instant',
        emailEnabled: true,
        whatsAppEnabled: false,
      });
      trackEmailSignup();
      setSubscribed(true);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Could not save your alert preferences. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden ${isModal ? 'max-w-2xl w-full mx-auto' : ''}`}>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 relative">
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
          <Bell className="w-32 h-32 text-indigo-400" />
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automated Daily Job Alerts</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
            Never Miss Official Vacancies
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
            Get instant Email alerts customized for your category, state, and qualification. Zero spam guaranteed.
          </p>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-8">
        {subscribed ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-heading font-extrabold text-slate-900">
              Alert Preferences Saved!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              We'll email <span className="font-bold text-slate-900">{email}</span> the moment a matching{' '}
              <span className="font-bold text-emerald-700">
                {categoriesList.filter((c) => selectedCategories.includes(c.slug)).map((c) => c.name).join(', ')}
              </span> vacancy is posted.
            </p>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Delivery:</span>
                <span className="font-bold text-slate-900">Email, in real-time</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Qualification:</span>
                <span className="font-bold text-slate-900">{selectedQualification}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Target Region:</span>
                <span className="font-bold text-slate-900">{selectedRegion}</span>
              </div>
            </div>

            {(whatsAppChannelUrl || telegramChannelUrl) && (
              <div className="max-w-md mx-auto">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Also join our official channels</p>
                <div className="flex items-center justify-center gap-2">
                  {whatsAppChannelUrl && (
                    <a
                      href={whatsAppChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={trackWhatsAppJoin}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Channel
                    </a>
                  )}
                  {telegramChannelUrl && (
                    <a
                      href={telegramChannelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Telegram Channel
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-center gap-3">
              <button
                onClick={() => setSubscribed(false)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Modify Alert Preferences
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  Close Window
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Contact details */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Email Address <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aspirant@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 pl-10 pr-3 py-3 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Category selection */}
                          <div>
                              <label className="text-xs font-bold text-slate-700 block mb-2">
                                  Category
                              </label>

                              <div className="relative">
                                  <Select
                                      value={categorySlots[0] || ""}
                                      onChange={(e) => setCategorySlot(0, e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                  >
                                      <option value="">Select Category</option>

                                      {categoriesList.map((cat) => (
                                          <option key={cat.id} value={cat.slug}>
                                              {cat.name}
                                          </option>
                                      ))}
                                  </Select>
                              </div>
                          </div>

            {/* Qualification & Region */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Highest Qualification</label>
                <Select
                  value={selectedQualification}
                  onChange={(e) => setSelectedQualification(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  {qualificationsList.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Region / State</label>
                <Select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                >
                  {regionsList.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Delivery */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Delivered by email, in real-time, as soon as a matching job is posted.</span>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl p-3">{errorMessage}</div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                1-Click Unsubscribe Anytime
              </span>

              <div className="flex gap-2">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? 'Saving…' : 'Activate Job Alerts'}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
