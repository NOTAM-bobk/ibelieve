import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Heart,
  Bookmark,
  Share2,
  Home,
  Tag,
  Gift,
  Flame,
  Sparkles,
  X,
  Check,
  User,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import AccountView from './AccountView.jsx';

/* ------------------------------------------------------------------ */
/* Category theming (visual only — no affirmation content is hard-    */
/* coded here, this is purely styling metadata used to color/organize */
/* whatever real affirmations come back from the APIs).                */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  {
    id: 'self-love',
    name: 'Self Love',
    emoji: '💖',
    gradient: 'from-pink-200 via-rose-200 to-fuchsia-200',
    text: 'text-rose-950',
    chip: 'bg-rose-500',
    keywords: ['love', 'worthy', 'myself', 'kind', 'care', 'body', 'deserve'],
  },
  {
    id: 'success',
    name: 'Success',
    emoji: '🚀',
    gradient: 'from-amber-200 via-yellow-100 to-orange-200',
    text: 'text-amber-950',
    chip: 'bg-amber-500',
    keywords: ['success', 'goal', 'achieve', 'opportunit', 'build', 'accomplish', 'earn'],
  },
  {
    id: 'anxiety',
    name: 'Calm & Anxiety',
    emoji: '🌊',
    gradient: 'from-sky-200 via-cyan-100 to-blue-200',
    text: 'text-sky-950',
    chip: 'bg-sky-500',
    keywords: ['calm', 'breathe', 'safe', 'peace', 'ease', 'relax', 'quiet'],
  },
  {
    id: 'gratitude',
    name: 'Gratitude',
    emoji: '🙏',
    gradient: 'from-emerald-200 via-green-100 to-teal-200',
    text: 'text-emerald-950',
    chip: 'bg-emerald-500',
    keywords: ['grateful', 'gratitude', 'thank', 'appreciat', 'bless', 'joy'],
  },
  {
    id: 'confidence',
    name: 'Confidence',
    emoji: '⚡',
    gradient: 'from-violet-200 via-purple-100 to-indigo-200',
    text: 'text-violet-950',
    chip: 'bg-violet-500',
    keywords: ['confiden', 'strong', 'capable', 'brave', 'power', 'trust'],
  },
  {
    id: 'motivation',
    name: 'Motivation',
    emoji: '🔥',
    gradient: 'from-red-200 via-orange-100 to-rose-200',
    text: 'text-red-950',
    chip: 'bg-red-500',
    keywords: ['motivat', 'energy', 'today', 'progress', 'forward', 'action', 'grow'],
  },
];

const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

/**
 * Neither public affirmation API returns a category, so we tag each
 * real affirmation with a lightweight keyword guess. If nothing
 * matches, fall back to a deterministic hash so the distribution
 * across categories stays reasonably even (not literally random junk
 * data — same text always lands in the same bucket).
 */
function guessCategory(text) {
  const lower = text.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((w) => lower.includes(w))) return cat.id;
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return CATEGORIES[hash % CATEGORIES.length].id;
}

let idCounter = 1;
const nextId = () => idCounter++;

/* ------------------------------------------------------------------ */
/* Live API sources — the app alternates between both on every fetch   */
/* ------------------------------------------------------------------ */

const AFFIRMATION_SOURCES = [
  {
    name: 'affirmations.dev',
    url: 'https://www.affirmations.dev/',
    parse: (data) => (typeof data === 'string' ? data : data?.affirmation),
  },
  {
    name: 'woof-affirmations-api',
    url: 'https://woof-affirmations-api.vercel.app/api/affirmation',
    parse: (data) =>
      typeof data === 'string' ? data : data?.affirmation || data?.message || data?.text || data?.data,
  },
];

async function fetchOneAffirmation() {
  // Randomly pick a source each call so requests switch between APIs
  const source = AFFIRMATION_SOURCES[Math.floor(Math.random() * AFFIRMATION_SOURCES.length)];
  const res = await fetch(source.url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${source.name} responded ${res.status}`);
  const data = await res.json();
  const text = source.parse(data);
  if (!text || typeof text !== 'string') throw new Error(`Unexpected payload from ${source.name}`);
  return text.trim();
}

async function fetchBatch(count, existingTexts) {
  const seen = new Set(existingTexts);
  const results = await Promise.allSettled(
    Array.from({ length: count }, () => fetchOneAffirmation())
  );
  const fresh = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && !seen.has(r.value)) {
      seen.add(r.value);
      fresh.push({ id: nextId(), text: r.value, categoryId: guessCategory(r.value) });
    }
  }
  return fresh;
}

/* ------------------------------------------------------------------ */
/* Local persistence helpers (real device-local data, not mock data)   */
/* ------------------------------------------------------------------ */

const STORAGE_KEYS = {
  liked: 'affirm.liked.v1',
  saved: 'affirm.saved.v1',
  viewed: 'affirm.viewed.v1',
  visits: 'affirm.visits.v1',
  likedCats: 'affirm.likedCats.v1',
};

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* storage unavailable — ignore */
  }
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function computeStreak(visitDates) {
  const daySet = new Set(visitDates);
  let streak = 0;
  const cursor = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/* ------------------------------------------------------------------ */
/* Toast                                                                */
/* ------------------------------------------------------------------ */

function Toast({ message, show }) {
  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 bg-neutral-900/90 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md">
        <Check size={16} className="text-emerald-400" />
        {message}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar (account button)                                            */
/* ------------------------------------------------------------------ */

function TopBar({ onOpenAccount }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-30 pt-safe pointer-events-none">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-auto">
          <Sparkles size={14} className="text-neutral-700" />
          <span className="text-xs font-bold text-neutral-800">Daily Affirmations</span>
        </div>
        <button
          onClick={onOpenAccount}
          className="w-11 h-11 rounded-2xl bg-white/40 backdrop-blur-md flex items-center justify-center shadow-sm active:scale-90 transition-transform pointer-events-auto"
          aria-label="Open account"
        >
          <User size={20} className="text-neutral-800" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feed Card                                                            */
/* ------------------------------------------------------------------ */

function FeedCard({ affirmation, isLiked, isSaved, onLike, onSave, onShare, registerRef, isLast }) {
  const cat = categoryById(affirmation.categoryId);
  const cardRef = useRef(null);
  const [heartPop, setHeartPop] = useState(false);
  const [saveBounce, setSaveBounce] = useState(false);

  useEffect(() => {
    if (cardRef.current) registerRef(affirmation.id, cardRef.current, isLast);
  }, [affirmation.id, registerRef, isLast]);

  const handleLike = () => {
    onLike(affirmation.id);
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 400);
  };

  const handleSave = () => {
    onSave(affirmation.id);
    setSaveBounce(true);
    setTimeout(() => setSaveBounce(false), 400);
  };

  return (
    <section
      ref={cardRef}
      data-id={affirmation.id}
      className={`relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center overflow-hidden bg-gradient-to-br ${cat.gradient}`}
    >
      {/* decorative soft blobs */}
      <div className="absolute -top-20 -left-16 w-72 h-72 bg-white/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-10 w-80 h-80 bg-white/20 rounded-full blur-3xl" />

      {/* category chip */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 animate-float-in">
        <span
          className={`${cat.chip} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5`}
        >
          <span>{cat.emoji}</span>
          {cat.name}
        </span>
      </div>

      {/* main text — generous side padding so it never collides with the action buttons */}
      <div
        key={affirmation.id}
        className="relative px-10 sm:px-14 max-w-[80%] sm:max-w-md text-center animate-float-in"
      >
        <p className={`text-3xl sm:text-4xl font-bold leading-snug ${cat.text}`}>
          {affirmation.text}
        </p>
      </div>

      {/* floating action buttons — smaller, tucked to the edge, well clear of the text */}
      <div className="absolute right-3 bottom-40 flex flex-col items-center gap-5">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-md transition-all duration-200 active:scale-90 ${
              isLiked ? 'bg-rose-500' : 'bg-white/40 group-hover:bg-white/60'
            } ${heartPop ? 'animate-pop' : ''}`}
          >
            <Heart
              size={20}
              className={isLiked ? 'text-white fill-white' : cat.text}
              strokeWidth={2.2}
            />
          </div>
          <span className={`text-[10px] font-bold ${cat.text}`}>Like</span>
        </button>

        <button onClick={handleSave} className="flex flex-col items-center gap-1 group">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-md transition-all duration-200 active:scale-90 ${
              isSaved ? 'bg-indigo-500' : 'bg-white/40 group-hover:bg-white/60'
            } ${saveBounce ? 'animate-pop' : ''}`}
          >
            <Bookmark
              size={18}
              className={isSaved ? 'text-white fill-white' : cat.text}
              strokeWidth={2.2}
            />
          </div>
          <span className={`text-[10px] font-bold ${cat.text}`}>Save</span>
        </button>

        <button
          onClick={() => onShare(affirmation.text)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-md bg-white/40 group-hover:bg-white/60 transition-all duration-200 active:scale-90">
            <Share2 size={18} className={cat.text} strokeWidth={2.2} />
          </div>
          <span className={`text-[10px] font-bold ${cat.text}`}>Share</span>
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / Error states                                               */
/* ------------------------------------------------------------------ */

function FeedLoading() {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100 px-8 text-center gap-4">
      <Loader2 size={34} className="text-violet-500 animate-spin-slow" />
      <p className="text-violet-900/70 font-semibold">Fetching today's affirmations…</p>
    </div>
  );
}

function FeedError({ onRetry }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-neutral-100 px-8 text-center gap-4">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 flex items-center justify-center">
        <X size={28} className="text-rose-500" />
      </div>
      <p className="text-neutral-600 font-semibold">Couldn't reach the affirmation APIs.</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 bg-neutral-900 text-white font-semibold px-5 py-2.5 rounded-full active:scale-95 transition-transform"
      >
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feed View                                                            */
/* ------------------------------------------------------------------ */

function FeedView({
  affirmations,
  liked,
  saved,
  onLike,
  onSave,
  onShare,
  onViewed,
  onReachEnd,
  activeCategory,
  onClearFilter,
}) {
  const cardRefs = useRef(new Map());

  const registerRef = useCallback((id, el) => {
    cardRefs.current.set(id, el);
  }, []);

  useEffect(() => {
    const viewObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            onViewed(Number(entry.target.dataset.id));
          }
        });
      },
      { threshold: [0.6] }
    );
    cardRefs.current.forEach((el) => viewObserver.observe(el));
    return () => viewObserver.disconnect();
  }, [affirmations, onViewed]);

  // Trigger infinite-load when the last card scrolls into view
  useEffect(() => {
    if (activeCategory || affirmations.length === 0) return;
    const lastId = affirmations[affirmations.length - 1]?.id;
    const el = cardRefs.current.get(lastId);
    if (!el) return;
    const endObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) onReachEnd();
        });
      },
      { threshold: 0.5 }
    );
    endObserver.observe(el);
    return () => endObserver.disconnect();
  }, [affirmations, activeCategory, onReachEnd]);

  if (affirmations.length === 0) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-neutral-100 px-8 text-center gap-4">
        <Sparkles className="text-neutral-400" size={40} />
        <p className="text-neutral-500 font-semibold">No affirmations in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full">
      {activeCategory && (
        <button
          onClick={onClearFilter}
          className="absolute top-20 left-4 z-20 flex items-center gap-1.5 bg-white/70 backdrop-blur-md text-neutral-800 text-xs font-bold pl-2 pr-3 py-1.5 rounded-full shadow-md active:scale-95 transition-transform"
        >
          <X size={14} /> Clear filter
        </button>
      )}
      <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory">
        {affirmations.map((a, i) => (
          <FeedCard
            key={a.id}
            affirmation={a}
            isLiked={liked.has(a.id)}
            isSaved={saved.has(a.id)}
            onLike={onLike}
            onSave={onSave}
            onShare={onShare}
            registerRef={registerRef}
            isLast={i === affirmations.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore View                                                         */
/* ------------------------------------------------------------------ */

function ExploreView({ onSelectCategory, counts }) {
  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-neutral-50 pb-32">
      <div className="px-6 pt-safe pt-24 pb-6">
        <h1 className="text-3xl font-extrabold text-neutral-900">Explore</h1>
        <p className="text-neutral-500 mt-1 font-medium">Pick a mood to focus your feed on.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 px-6">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`animate-float-in relative overflow-hidden rounded-[28px] p-5 h-40 flex flex-col justify-between text-left shadow-sm active:scale-95 transition-transform bg-gradient-to-br ${cat.gradient}`}
          >
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/25 rounded-full blur-xl" />
            <span className="text-3xl relative">{cat.emoji}</span>
            <div className="relative">
              <p className={`font-bold text-lg ${cat.text}`}>{cat.name}</p>
              <p className={`text-xs font-semibold opacity-70 ${cat.text}`}>
                {counts[cat.id] || 0} loaded
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights View                                                        */
/* ------------------------------------------------------------------ */

function InsightsView({ viewedCount, likedCount, savedCount, streak, categoryBreakdown }) {
  const maxCount = Math.max(1, ...categoryBreakdown.map((c) => c.count));

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-neutral-50 pb-32">
      <div className="px-6 pt-safe pt-24 pb-6">
        <h1 className="text-3xl font-extrabold text-neutral-900">Your Journey</h1>
        <p className="text-neutral-500 mt-1 font-medium">
          A real snapshot of this device's activity.
        </p>
      </div>

      {/* Streak card */}
      <div className="mx-6 rounded-[28px] bg-gradient-to-br from-orange-300 via-amber-200 to-yellow-200 p-6 shadow-sm flex items-center justify-between animate-float-in">
        <div>
          <p className="text-amber-900/70 font-bold text-sm">Current Streak</p>
          <p className="text-4xl font-extrabold text-amber-950 mt-1">
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
          <p className="text-amber-900/70 text-xs mt-1 font-semibold">Keep it going!</p>
        </div>
        <div className="w-16 h-16 bg-white/40 rounded-3xl flex items-center justify-center">
          <Flame size={32} className="text-amber-950" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mx-6 mt-4">
        <div className="rounded-[24px] bg-white p-4 shadow-sm text-center animate-float-in">
          <p className="text-2xl font-extrabold text-neutral-900">{viewedCount}</p>
          <p className="text-xs text-neutral-500 font-bold mt-0.5">Viewed</p>
        </div>
        <div
          className="rounded-[24px] bg-white p-4 shadow-sm text-center animate-float-in"
          style={{ animationDelay: '80ms' }}
        >
          <p className="text-2xl font-extrabold text-rose-500">{likedCount}</p>
          <p className="text-xs text-neutral-500 font-bold mt-0.5">Liked</p>
        </div>
        <div
          className="rounded-[24px] bg-white p-4 shadow-sm text-center animate-float-in"
          style={{ animationDelay: '160ms' }}
        >
          <p className="text-2xl font-extrabold text-indigo-500">{savedCount}</p>
          <p className="text-xs text-neutral-500 font-bold mt-0.5">Saved</p>
        </div>
      </div>

      {/* Category breakdown, based on what's actually been liked */}
      <div className="mx-6 mt-6 rounded-[28px] bg-white p-6 shadow-sm animate-float-in">
        <p className="font-bold text-neutral-900 mb-4">Top Categories</p>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-neutral-400 font-medium">
            Like a few affirmations to see your top moods here.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {categoryBreakdown.map((c) => {
              const cat = categoryById(c.id);
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span className="text-neutral-700">
                      {cat.emoji} {cat.name}
                    </span>
                    <span className="text-neutral-400">{c.count}</span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.chip} transition-all duration-700`}
                      style={{ width: `${(c.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom Navigation — image-referenced style                          */
/* ------------------------------------------------------------------ */

function BottomNav({ activeTab, setActiveTab }) {
  const items = [
    { id: 'feed', label: 'Dashboard', icon: Home },
    { id: 'explore', label: 'Offers', icon: Tag },
    { id: 'insights', label: 'Rewards', icon: Gift },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="bg-white rounded-t-[32px] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] px-4 pt-4 pb-3 flex items-center justify-around">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex flex-col items-center gap-1.5 px-4"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  active ? 'bg-violet-100 scale-105' : 'bg-transparent'
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={2.3}
                  className={`transition-colors duration-300 ${
                    active ? 'text-violet-700' : 'text-neutral-400'
                  }`}
                />
              </div>
              <span
                className={`text-xs font-bold transition-colors duration-300 ${
                  active ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {label}
              </span>
              <span
                className={`absolute -bottom-3 h-[3px] rounded-full bg-neutral-900 transition-all duration-300 ${
                  active ? 'w-7 opacity-100' : 'w-0 opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* App Root                                                             */
/* ------------------------------------------------------------------ */

const INITIAL_BATCH = 12;
const LOAD_MORE_BATCH = 6;

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [affirmations, setAffirmations] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAccount, setShowAccount] = useState(false);

  const [liked, setLiked] = useState(() => loadSet(STORAGE_KEYS.liked));
  const [saved, setSaved] = useState(() => loadSet(STORAGE_KEYS.saved));
  const [viewed, setViewed] = useState(() => loadSet(STORAGE_KEYS.viewed));
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '' });

  const loadingMoreRef = useRef(false);

  // Record today's visit + compute streak once on mount
  useEffect(() => {
    const visits = loadJSON(STORAGE_KEYS.visits, []);
    const key = todayKey();
    if (!visits.includes(key)) visits.push(key);
    saveJSON(STORAGE_KEYS.visits, visits);
    setStreak(computeStreak(visits));
  }, []);

  // Persist interaction sets whenever they change
  useEffect(() => saveSet(STORAGE_KEYS.liked, liked), [liked]);
  useEffect(() => saveSet(STORAGE_KEYS.saved, saved), [saved]);
  useEffect(() => saveSet(STORAGE_KEYS.viewed, viewed), [viewed]);

  const loadInitial = useCallback(async () => {
    setStatus('loading');
    try {
      const batch = await fetchBatch(INITIAL_BATCH, []);
      if (batch.length === 0) throw new Error('No affirmations returned');
      setAffirmations(batch);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 1800);
  }, []);

  const handleReachEnd = useCallback(() => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setAffirmations((current) => {
      fetchBatch(LOAD_MORE_BATCH, current.map((a) => a.text))
        .then((fresh) => {
          if (fresh.length) setAffirmations((prev) => [...prev, ...fresh]);
        })
        .finally(() => {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        });
      return current;
    });
  }, []);

  const handleLike = useCallback(
    (id) => {
      setLiked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          showToast('Added to liked');
        }
        return next;
      });
    },
    [showToast]
  );

  const handleSave = useCallback(
    (id) => {
      setSaved((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          showToast('Saved for later');
        }
        return next;
      });
    },
    [showToast]
  );

  const handleShare = useCallback(
    async (text) => {
      const shareData = { title: 'Daily Affirmation', text };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(text);
          showToast('Copied to clipboard');
        }
      } catch {
        /* user cancelled the share sheet — ignore */
      }
    },
    [showToast]
  );

  const handleViewed = useCallback((id) => {
    setViewed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleSelectCategory = useCallback((catId) => {
    setActiveCategory(catId);
    setActiveTab('feed');
  }, []);

  const displayedAffirmations = activeCategory
    ? affirmations.filter((a) => a.categoryId === activeCategory)
    : affirmations;

  const categoryCounts = useMemo(() => {
    return CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = affirmations.filter((a) => a.categoryId === cat.id).length;
      return acc;
    }, {});
  }, [affirmations]);

  const categoryBreakdown = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      id: cat.id,
      count: affirmations.filter((a) => liked.has(a.id) && a.categoryId === cat.id).length,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [affirmations, liked]);

  return (
    <div className="relative w-full h-[100dvh] bg-neutral-100 overflow-hidden">
      <Toast message={toast.message} show={toast.show} />
      <TopBar onOpenAccount={() => setShowAccount(true)} />

      {activeTab === 'feed' && status === 'loading' && <FeedLoading />}
      {activeTab === 'feed' && status === 'error' && <FeedError onRetry={loadInitial} />}
      {activeTab === 'feed' && status === 'ready' && (
        <FeedView
          affirmations={displayedAffirmations}
          liked={liked}
          saved={saved}
          onLike={handleLike}
          onSave={handleSave}
          onShare={handleShare}
          onViewed={handleViewed}
          onReachEnd={handleReachEnd}
          activeCategory={activeCategory}
          onClearFilter={() => setActiveCategory(null)}
        />
      )}

      {activeTab === 'explore' && (
        <ExploreView onSelectCategory={handleSelectCategory} counts={categoryCounts} />
      )}

      {activeTab === 'insights' && (
        <InsightsView
          viewedCount={viewed.size}
          likedCount={liked.size}
          savedCount={saved.size}
          streak={streak}
          categoryBreakdown={categoryBreakdown}
        />
      )}

      {loadingMore && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-md">
          <Loader2 size={14} className="animate-spin-slow text-violet-500" />
          <span className="text-xs font-bold text-neutral-700">Loading more…</span>
        </div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {showAccount && (
        <AccountView
          onClose={() => setShowAccount(false)}
          stats={{ viewed: viewed.size, liked: liked.size, saved: saved.size }}
        />
      )}
    </div>
  );
}
