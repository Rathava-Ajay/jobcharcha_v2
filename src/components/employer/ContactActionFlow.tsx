import React, { useState } from 'react';
import { Loader2, Phone, Mail, AlertTriangle, Send } from 'lucide-react';
import { contactCandidate } from '../../api/employerCandidates';
import { ContactAttemptResult } from '../../types';
import { ApiError } from '../../api/client';

interface ContactActionFlowProps {
  candidateUserId: string;
  candidateName: string;
  onUnlocked?: (result: ContactAttemptResult) => void;
  onGoToBilling: () => void;
}

const BLOCKED_COPY: Record<string, { title: string; body: string }> = {
  blocked_expired: {
    title: 'Your plan has expired',
    body: 'Renew your subscription to continue contacting candidates.',
  },
  blocked_no_credits: {
    title: "You've used all your contact credits",
    body: 'Buy more credits or upgrade your plan to keep unlocking candidates.',
  },
  blocked_both: {
    title: 'Your plan has expired and you have no contact credits left',
    body: 'Renew your subscription and top up credits to continue.',
  },
};

export const ContactActionFlow: React.FC<ContactActionFlowProps> = ({ candidateUserId, candidateName, onUnlocked, onGoToBilling }) => {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ContactAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleContact = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await contactCandidate(candidateUserId, message.trim() || undefined);
      setResult(res);
      if (res.allowed) onUnlocked?.(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.allowed) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
        <p className="text-xs font-extrabold text-emerald-800">
          {result.reason === 'already_unlocked' ? 'Already unlocked' : 'Contact unlocked!'}
        </p>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Phone className="w-4 h-4 text-emerald-600" /> {result.phone || 'Not provided'}
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Mail className="w-4 h-4 text-emerald-600" /> {result.email || 'Not provided'}
        </div>
        <p className="text-[11px] text-emerald-700 font-semibold">
          {result.isUnlimited ? 'Unlimited plan' : `${result.creditsRemaining} contact credit${result.creditsRemaining === 1 ? '' : 's'} remaining`}
        </p>
      </div>
    );
  }

  if (result && !result.allowed) {
    const showExpired = result.reason === 'blocked_expired' || result.reason === 'blocked_both';
    const showNoCredits = result.reason === 'blocked_no_credits' || result.reason === 'blocked_both';
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {showExpired && <p className="text-xs font-bold text-red-800">{BLOCKED_COPY.blocked_expired.title}. {BLOCKED_COPY.blocked_expired.body}</p>}
            {showNoCredits && <p className="text-xs font-bold text-red-800">{BLOCKED_COPY.blocked_no_credits.title}. {BLOCKED_COPY.blocked_no_credits.body}</p>}
          </div>
        </div>
        <button
          onClick={onGoToBilling}
          className="bg-slate-900 text-white text-xs font-extrabold px-4 py-2 rounded-xl cursor-pointer"
        >
          {showExpired && showNoCredits ? 'Renew Plan & Buy Credits' : showExpired ? 'Renew Subscription' : 'Buy Credits'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Optional message to ${candidateName} (shown in your contact history)`}
        rows={2}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
      />
      {error && <p className="text-[11px] text-red-600 font-semibold">{error}</p>}
      <button
        onClick={handleContact}
        disabled={submitting}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
      >
        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Contact Candidate
      </button>
    </div>
  );
};
