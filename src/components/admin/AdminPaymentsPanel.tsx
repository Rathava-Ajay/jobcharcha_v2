import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Undo2, AlertTriangle, ReceiptText, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  adminGetStuckPayments, adminResyncPayment, adminRefundPayment, StuckPayment,
  adminGetRazorpayHealth, RazorpayHealth,
} from '../../api/adminPayments';
import { adminRefundStoreOrder } from '../../api/adminStoreOrders';
import { ApiError } from '../../api/client';
import { Select } from '../ui/Select';

const RESOLVED_LABEL: Record<string, string> = {
  Paid: 'Resolved — Paid',
  Failed: 'Resolved — Failed',
  StillPending: 'Still pending at Razorpay',
};

export const AdminPaymentsPanel: React.FC = () => {
  const [stuck, setStuck] = useState<StuckPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [resyncingId, setResyncingId] = useState<number | null>(null);
  const [resyncResult, setResyncResult] = useState<Record<number, string>>({});
  const [resyncError, setResyncError] = useState<Record<number, string>>({});

  const [refundKind, setRefundKind] = useState<'payment' | 'store-order'>('payment');
  const [refundId, setRefundId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundResult, setRefundResult] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const [health, setHealth] = useState<RazorpayHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadHealth = useCallback(() => {
    setHealthLoading(true);
    adminGetRazorpayHealth().then(setHealth).catch(() => setHealth(null)).finally(() => setHealthLoading(false));
  }, []);

  const loadStuck = useCallback(() => {
    setLoading(true);
    adminGetStuckPayments(30).then(setStuck).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadStuck(); loadHealth(); }, [loadStuck, loadHealth]);

  const resync = async (paymentId: number) => {
    setResyncingId(paymentId);
    setResyncError((e) => ({ ...e, [paymentId]: '' }));
    try {
      const res = await adminResyncPayment(paymentId);
      setResyncResult((r) => ({ ...r, [paymentId]: res.resolvedStatus }));
      if (res.resolvedStatus !== 'StillPending') {
        setStuck((list) => list.filter((p) => p.paymentId !== paymentId));
      }
    } catch (err) {
      setResyncError((e) => ({ ...e, [paymentId]: err instanceof ApiError ? err.message : 'Resync failed.' }));
    } finally {
      setResyncingId(null);
    }
  };

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Number(refundId);
    if (!id || id <= 0) { setRefundError('Enter a valid numeric ID.'); return; }
    if (!refundReason.trim()) { setRefundError('A reason is required.'); return; }
    setRefundBusy(true);
    setRefundError(null);
    setRefundResult(null);
    try {
      if (refundKind === 'payment') {
        const res = await adminRefundPayment(id, refundReason.trim());
        setRefundResult(`Refunded payment #${res.paymentId} — Razorpay refund ${res.razorpayRefundId}. Access revoked: ${res.accessRevoked ? 'yes' : 'no'}.`);
      } else {
        const res = await adminRefundStoreOrder(id, refundReason.trim());
        setRefundResult(`Refunded order #${res.orderId} — Razorpay refund ${res.razorpayRefundId}.`);
      }
      setRefundId('');
      setRefundReason('');
    } catch (err) {
      setRefundError(err instanceof ApiError ? err.message : 'Refund failed.');
    } finally {
      setRefundBusy(false);
    }
  };

  const healthOk = health?.authenticated === true;

  return (
    <div className="space-y-6">
      {/* Razorpay connectivity — makes a broken/misconfigured gateway obvious without taking a payment. */}
      <div className={`rounded-3xl border p-5 sm:p-6 ${
        healthLoading ? 'bg-slate-50 border-slate-200'
        : healthOk ? 'bg-emerald-50/70 border-emerald-200'
        : 'bg-rose-50/70 border-rose-200'
      }`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5">
            {healthOk
              ? <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              : <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />}
            <div>
              <h2 className="text-sm font-heading font-extrabold text-slate-900">
                Razorpay gateway: {healthLoading ? 'checking…' : healthOk ? 'Connected' : 'NOT working'}
              </h2>
              {!healthLoading && health && (
                <>
                  <p className={`text-xs mt-0.5 font-semibold ${healthOk ? 'text-emerald-800' : 'text-rose-800'}`}>{health.detail}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Key ID: {health.keyIdConfigured ? <b>{health.keyIdMasked}</b> : <span className="text-rose-600 font-bold">not set</span>}
                    {' · '}Key secret: {health.keySecretConfigured ? 'set' : <span className="text-rose-600 font-bold">not set</span>}
                    {' · '}Webhook secret: {health.webhookSecretConfigured ? 'set' : <span className="text-rose-600 font-bold">not set</span>}
                    {health.webhookSecretEqualsKeySecret && <span className="text-amber-700 font-bold"> · ⚠ webhook secret equals key secret (webhooks will be rejected)</span>}
                  </p>
                  {!healthOk && (
                    <p className="text-[11px] text-rose-700 mt-1.5">
                      Set <code>Razorpay__KeyId</code> / <code>Razorpay__KeySecret</code> as environment variables on the API host and restart the service.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <button onClick={loadHealth} className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} /> Re-check
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Reconciliation — Stuck Payments
          </h2>
          <button onClick={loadStuck} className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500 -mt-3">
          Aspirant payments stuck &quot;Pending&quot; for 30+ minutes — where our local status and Razorpay&apos;s
          own record may disagree. The hourly reconciliation job resyncs these automatically; use Resync
          below to resolve one immediately.
        </p>

        {loading ? (
          <div className="text-xs text-slate-400 font-semibold">Loading…</div>
        ) : stuck.length === 0 ? (
          <div className="text-xs text-slate-400 font-semibold">No discrepancies — everything reconciled.</div>
        ) : (
          <div className="space-y-2">
            {stuck.map((p) => (
              <div key={p.paymentId} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-900">Payment #{p.paymentId}</span>
                  <span className="text-slate-400"> · {p.paymentFor} · ₹{p.amount}</span>
                  <div className="text-slate-400">
                    {p.userId} · pending {p.minutesPending} min · order {p.razorpayOrderId ?? '—'}
                  </div>
                  {resyncResult[p.paymentId] && (
                    <div className="font-bold text-emerald-700 mt-1">{RESOLVED_LABEL[resyncResult[p.paymentId]] || resyncResult[p.paymentId]}</div>
                  )}
                  {resyncError[p.paymentId] && <div className="font-bold text-rose-600 mt-1">{resyncError[p.paymentId]}</div>}
                </div>
                <button
                  onClick={() => resync(p.paymentId)}
                  disabled={resyncingId === p.paymentId}
                  className="bg-slate-900 disabled:opacity-60 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resyncingId === p.paymentId ? 'animate-spin' : ''}`} />
                  {resyncingId === p.paymentId ? 'Resyncing…' : 'Resync'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
          <Undo2 className="w-5 h-5 text-red-600" /> Issue a Refund
        </h2>
        <p className="text-xs text-slate-500 -mt-2">
          Calls Razorpay&apos;s refund API for a <b>Paid</b> record, marks it Refunded, and (for aspirant
          wallet top-ups) claws back any still-unspent wallet credit that top-up granted.
        </p>
        <form onSubmit={submitRefund} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select
              value={refundKind}
              onChange={(e) => setRefundKind(e.target.value as 'payment' | 'store-order')}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold"
            >
              <option value="payment">Aspirant Payment ID</option>
              <option value="store-order">Store Order ID</option>
            </Select>
            <input
              type="number" min={1} value={refundId} onChange={(e) => setRefundId(e.target.value)}
              placeholder="ID" className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            />
            <input
              value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason (required)"
              className="flex-1 min-w-[200px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            />
            <button type="submit" disabled={refundBusy} className="bg-red-600 disabled:opacity-60 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5">
              <ReceiptText className="w-3.5 h-3.5" /> {refundBusy ? 'Refunding…' : 'Refund'}
            </button>
          </div>
          {refundError && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-xs font-semibold">{refundError}</div>}
          {refundResult && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 text-xs font-semibold">{refundResult}</div>}
        </form>
      </div>
    </div>
  );
};
