import React from 'react';
import { X, User, Settings, Bell, LogOut, ChevronRight } from 'lucide-react';

/**
 * AccountView
 * ------------------------------------------------------------------
 * This is a placeholder screen wired up to the account button in the
 * top-right corner of App.jsx. It's intentionally simple for now —
 * flesh this out later with real auth, profile data, settings, etc.
 * Kept in its own file on purpose so it's easy to expand without
 * touching App.jsx again.
 * ------------------------------------------------------------------
 */
export default function AccountView({ onClose, stats }) {
  const menuItems = [
    { icon: User, label: 'Edit Profile' },
    { icon: Bell, label: 'Notifications' },
    { icon: Settings, label: 'Preferences' },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-neutral-50 animate-slide-up overflow-y-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-violet-300 via-purple-200 to-fuchsia-200 pt-safe pb-10 px-6 rounded-b-[36px]">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/50 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Close account"
        >
          <X size={20} className="text-violet-950" />
        </button>

        <div className="pt-14 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-[28px] bg-white/50 backdrop-blur-md flex items-center justify-center shadow-lg mb-4">
            <User size={40} className="text-violet-950" />
          </div>
          <h1 className="text-2xl font-bold text-violet-950">Your Account</h1>
          <p className="text-violet-950/60 text-sm font-medium mt-1">
            Sign in to sync across devices
          </p>
        </div>
      </div>

      {/* Quick stats pulled from the real local session data */}
      <div className="grid grid-cols-3 gap-3 px-6 -mt-6">
        {[
          { label: 'Viewed', value: stats?.viewed ?? 0 },
          { label: 'Liked', value: stats?.liked ?? 0 },
          { label: 'Saved', value: stats?.saved ?? 0 },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-[22px] shadow-sm p-4 text-center"
          >
            <p className="text-xl font-bold text-neutral-900">{s.value}</p>
            <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="px-6 mt-8">
        <div className="bg-white rounded-[24px] shadow-sm divide-y divide-neutral-100 overflow-hidden">
          {menuItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 px-5 py-4 active:bg-neutral-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <Icon size={17} className="text-violet-700" />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-neutral-700">
                {label}
              </span>
              <ChevronRight size={16} className="text-neutral-300" />
            </button>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-2 mt-4 py-4 rounded-[24px] bg-white shadow-sm text-rose-500 font-semibold text-sm active:scale-[0.98] transition-transform">
          <LogOut size={16} />
          Sign Out
        </button>

        <p className="text-center text-xs text-neutral-400 font-medium mt-6 pb-10">
          v1.0.0 · More account features coming soon
        </p>
      </div>
    </div>
  );
}
