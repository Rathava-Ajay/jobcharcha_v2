import React, { useState } from 'react';
import { Bell, Check, X, Sparkles, AlertCircle, FileText, Briefcase, Award, ShoppingBag } from 'lucide-react';
import { InAppNotification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose, onSelectTab }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([
    {
      id: 'notif-1',
      title: 'SSC CGL 2026 Notification Released',
      message: '14,250 posts announced for ASO & Inspector roles. Apply before Sept 15, 2026.',
      type: 'job',
      timestamp: '10 mins ago',
      read: false,
      link: 'jobs'
    },
    {
      id: 'notif-2',
      title: 'RRB NTPC Hall Ticket Live',
      message: 'Admit Card for Phase 1 Computer Based Test available for download now.',
      type: 'admit_card',
      timestamp: '1 hour ago',
      read: false,
      link: 'exams'
    },
    {
      id: 'notif-3',
      title: 'IBPS PO Preliminary Cutoff Published',
      message: 'Check official category-wise cutoffs and merit list PDF.',
      type: 'result',
      timestamp: '3 hours ago',
      read: true,
      link: 'exams'
    },
    {
      id: 'notif-4',
      title: 'Order Confirmed: UPSC GS Mindmaps Book',
      message: 'Your hardcopy book order #ORD-9842 has been dispatched via BlueDart.',
      type: 'order',
      timestamp: 'Yesterday',
      read: true,
      link: 'store'
    }
  ]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: InAppNotification) => {
    setNotifications(notifications.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.link) {
      onSelectTab(notif.link);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base leading-none">Notification Hub</h3>
              <p className="text-[11px] text-slate-400 mt-1">Real-time recruitment & exam alerts</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-700">
            {unreadCount} Unread Notifications
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                notif.read
                  ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  notif.type === 'job' ? 'bg-indigo-100 text-indigo-700' :
                  notif.type === 'admit_card' ? 'bg-amber-100 text-amber-700' :
                  notif.type === 'result' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {notif.type === 'job' ? <Briefcase className="w-4 h-4" /> :
                   notif.type === 'admit_card' ? <Award className="w-4 h-4" /> :
                   notif.type === 'result' ? <FileText className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-slate-900">{notif.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{notif.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500">
            🔔 Push Notification preference active. Instant alerts sent to your mobile app and browser.
          </p>
        </div>

      </div>
    </div>
  );
};
