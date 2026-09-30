import React, { useState } from 'react';
import { Mail, Phone, LifeBuoy, Send, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { submitContact } from '../api/contact';
import { ApiError } from '../api/client';

const SUBJECTS = [
  'General Inquiry',
  'Job Posting Issue',
  'Technical Support',
  'Report Incorrect Job Info',
  'Partnership / Advertising',
  'Other',
];

export default function ContactPage() {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitContact({ name, email, phone: phone || undefined, subject, message });
      setSubmitted(true);
      setMessage('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1">
        <div className="bg-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-4">
            <LifeBuoy className="w-3.5 h-3.5" /> Contact & Support
          </div>
          <h1 className="text-2xl sm:text-4xl font-heading font-extrabold tracking-tight mb-3">We're here to help</h1>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            Questions about a job listing, your account, or the portal? Send us a message and our team will respond shortly.
          </p>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Email</span>
                  <span className="font-bold text-slate-800 text-sm">support@jobcharcha.com</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Toll Free Support</span>
                  <span className="font-bold text-slate-800 text-sm">+91 9136995118 </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                Typical response time: within 24–48 hours on business days.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 sm:p-8">
              {submitted ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                  <h2 className="text-lg font-heading font-extrabold text-slate-900 mb-1">Message sent</h2>
                  <p className="text-xs text-slate-500 mb-5">Thanks for reaching out — we'll get back to you shortly.</p>
                  <button onClick={() => setSubmitted(false)} className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-3 py-2.5">{error}</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                      <input required value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Phone (optional)</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Topic</label>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer">
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Message</label>
                    <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us how we can help..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium" />
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>{submitting ? 'Sending…' : 'Send Message'}</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
