import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Heart,
  Bookmark,
  Share2,
  Home,
  Shapes,
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
import CategoriesView from './CategoriesView.jsx';
import { QUOTE_SOURCES, sourceById } from './quoteSources.js';

let idCounter = 1;
const nextId = () => idCounter++;

async function fetchBatch(count, existingTexts, sourceId) {
  const source = sourceById(sourceId);
  const seen = new Set(existingTexts);
  const results = await Promise.allSettled(
    Array.from({ length: count }, () => source.fetchOne())
  );
  const fresh = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && !seen.has(r.value)) {
      seen.add(r.value);
      fresh.push({ id: nextId(), text: r.value, sourceId: source.id });
    }
  }
  return fresh;
}

/* ------------------------------------------------------------------ */
/* Local persistence helpers (real device-local data, not mock data)   */
/* ------------------------------------------------------------------ */

const STORAGE_KEYS = {
  liked: 'ibelieve.liked.v1',
  saved: 'ibelieve.saved.v1',
  viewed: 'ibelieve.viewed.v1',
  visits: 'ibelieve.visits.v1',
};

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
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
/* Top bar (app name + account button)                                  */
/* ------------------------------------------------------------------ */

function TopBar({ onOpenAccount }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-30 pt-safe pointer-events-none">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-auto">
          <Sparkles size={14} className="text-neutral-700" />
          <span className="text-xs font-bold text-neutral-800">ibelieve</span>
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
/* Feed Card — now a squarer tile centered on each snap section         */
/* ------------------------------------------------------------------ */

function FeedCard({ quote, isLiked, isSaved, onLike, onSave, onShare, registerRef, isLast }) {
  const source = sourceById(quote.sourceId);
  const cardRef = useRef(null);
  const [heartPop, setHeartPop] = useState(false);
  const [saveBounce, setSaveBounce] = useState(false);

  useEffect(() => {
    if (cardRef.current) registerRef(quote.id, cardRef.current, isLast);
  }, [quote.id, registerRef, isLast]);

  const handleLike = () => {
    onLike(quote.id);
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 400);
  };

  const handleSave = () => {
    onSave(quote.id);
    setSaveBounce(true);
    setTimeout(() => setSaveBounce(false), 400);
  };

  return (
    <section
      ref={cardRef}
      data-id={quote.id}
      className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-neutral-100 px-5"
    >
      <div
        className={`relative w-full max-w-sm aspect-square rounded-[40px] shadow-xl overflow-hidden flex flex-col items-center justify-center p-8 bg-gradient-to-br ${source.gradient}`}
      >
        {/* decorative soft blobs */}
        <div className="absolute -top-16 -left-12 w-56 h-56 bg-white/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -right-8 w-56 h-56 bg-white/20 rounded-full blur-3xl" />

        {/* category chip */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 animate-float-in">
          <span
            className={`${source.chip} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5`}
          >
            <span>{source.emoji}</span>
            {source.name}
          </span>
        </div>

        {/* main text */}
        <div key={quote.id} className="relative px-4 text-center animate-float-in">
          <p className={`text-2xl sm:text-3xl font-bold leading-snug ${source.text}`}>
            {quote.text}
          </p>
        </div>

        {/* floating action buttons — tucked inside the card, clear of the text */}
        <div className="absolute right-4 bottom-4 flex flex-col items-center gap-3">
          <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-md transition-all duration-200 active:scale-90 ${
                isLiked ? 'bg-rose-500' : 'bg-white/40 group-hover:bg-white/60'
              } ${heartPop ? 'animate-pop' : ''}`}
            >
              <Heart
                size={18}
                className={isLiked ? 'text-white fill-white' : source.text}
                strokeWidth={2.2}
              />
            </div>
          </button>

          <button onClick={handleSave} className="flex flex-col items-center gap-1 group">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-md transition-all duration-200 active:scale-90 ${
                isSaved ? 'bg-indigo-500' : 'bg-white/40 group-hover:bg-white/60'
              } ${saveBounce ? 'animate-pop' : ''}`}
            >
              <Bookmark
                size={16}
                className={isSaved ? 'text-white fill-white' : source.text}
                strokeWidth={2.2}
              />
            </div>
          </button>

          <button onClick={() => onShare(quote.text)} className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-md bg-white/40 group-hover:bg-white/60 transition-all duration-200 active:scale-90">
              <Share2 size={16} className={source.text} strokeWidth={2.2} />
            </div>
          </button>
        </div>
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
      <p className="text-violet-900/70 font-semibold">Fetching fresh quotes…</p>
    </div>
  );
}

function FeedError({ onRetry }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-neutral-100 px-8 text-center gap-4">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 flex items-center justify-center">
        <X size={28} className="text-rose-500" />
      </div>
      <p className="text-neutral-600 font-semibold">Couldn't reach that API.</p>
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
  quotes,
  liked,
  saved,
  onLike,
  onSave,
  onShare,
  onViewed,
  onReachEnd,
  activeSourceId,
  onResetToDefault,
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
  }, [quotes, onViewed]);

  useEffect(() => {
    if (quotes.length === 0) return;
    const lastId = quotes[quotes.length - 1]?.id;
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
  }, [quotes, onReachEnd]);

  const isDefault = activeSourceId === QUOTE_SOURCES[0].id;

  return (
    <div className="relative h-[100dvh] w-full">
      {!isDefault && (
        <button
          onClick={onResetToDefault}
          className="absolute top-20 left-4 z-20 flex items-center gap-1.5 bg-white/70 backdrop-blur-md text-neutral-800 text-xs font-bold pl-2 pr-3 py-1.5 rounded-full shadow-md active:scale-95 transition-transform"
        >
          <X size={14} /> Back to {QUOTE_SOURCES[0].name}
        </button>
      )}
      <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory">
        {quotes.map((q, i) => (
          <FeedCard
            key={q.id}
            quote={q}
            isLiked={liked.has(q.id)}
            isSaved={saved.has(q.id)}
            onLike={onLike}
            onSave={onSave}
            onShare={onShare}
            registerRef={registerRef}
            isLast={i === quotes.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights View                                                        */
/* ------------------------------------------------------------------ */

function InsightsView({ viewedCount, likedCount, savedCount, streak, sourceBreakdown }) {
  const maxCount = Math.max(1, ...sourceBreakdown.map((c) => c.count));

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-neutral-50 pb-32">
      <div className="px-6 pt-safe pt-24 pb-6">
        <h1 className="text-3xl font-extrabold text-neutral-900">Your Journey</h1>
        <p className="text-neutral-500 mt-1 font-medium">
          A real snapshot of this device's activity.
        </p>
      </div>

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

      <div className="mx-6 mt-6 rounded-[28px] bg-white p-6 shadow-sm animate-float-in">
        <p className="font-bold text-neutral-900 mb-4">Top Categories</p>
        {sourceBreakdown.length === 0 ? (
          <p className="text-sm text-neutral-400 font-medium">
            Like a few quotes to see your favorite categories here.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {sourceBreakdown.map((c) => {
              const source = sourceById(c.id);
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span className="text-neutral-700">
                      {source.emoji} {source.name}
                    </span>
                    <span className="text-neutral-400">{c.count}</span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${source.chip} transition-all duration-700`}
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
/* Bottom Navigation — Material 3 Expressive styling                    */
/* ------------------------------------------------------------------ */

function BottomNav({ activeTab, setActiveTab }) {
  const items = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'categories', label: 'Categories', icon: Shapes },
    { id: 'insights', label: 'Insights', icon: Gift },
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

const INITIAL_BATCH = 10;
const LOAD_MORE_BATCH = 6;
const DEFAULT_SOURCE_ID = QUOTE_SOURCES[0].id;

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [activeSourceId, setActiveSourceId] = useState(DEFAULT_SOURCE_ID);
  const [quotes, setQuotes] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const [liked, setLiked] = useState(() => loadSet(STORAGE_KEYS.liked));
  const [saved, setSaved] = useState(() => loadSet(STORAGE_KEYS.saved));
  const [viewed, setViewed] = useState(() => loadSet(STORAGE_KEYS.viewed));
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '' });

  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const visits = loadJSON(STORAGE_KEYS.visits, []);
    const key = todayKey();
    if (!visits.includes(key)) visits.push(key);
    saveJSON(STORAGE_KEYS.visits, visits);
    setStreak(computeStreak(visits));
  }, []);

  useEffect(() => saveSet(STORAGE_KEYS.liked, liked), [liked]);
  useEffect(() => saveSet(STORAGE_KEYS.saved, saved), [saved]);
  useEffect(() => saveSet(STORAGE_KEYS.viewed, viewed), [viewed]);

  const loadForSource = useCallback(async (sourceId) => {
    setStatus('loading');
    setQuotes([]);
    try {
      const batch = await fetchBatch(INITIAL_BATCH, [], sourceId);
      if (batch.length === 0) throw new Error('No quotes returned');
      setQuotes(batch);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadForSource(activeSourceId);
  }, [activeSourceId, loadForSource]);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 1800);
  }, []);

  const handleReachEnd = useCallback(() => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setQuotes((current) => {
      fetchBatch(LOAD_MORE_BATCH, current.map((q) => q.text), activeSourceId)
        .then((fresh) => {
          if (fresh.length) setQuotes((prev) => [...prev, ...fresh]);
        })
        .finally(() => {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        });
      return current;
    });
  }, [activeSourceId]);

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
      const shareData = { title: 'ibelieve', text };
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

  const handleSelectSource = useCallback((sourceId) => {
    setActiveSourceId(sourceId);
    setActiveTab('feed');
  }, []);

  const sourceBreakdown = useMemo(() => {
    return QUOTE_SOURCES.map((source) => ({
      id: source.id,
      count: quotes.filter((q) => liked.has(q.id) && q.sourceId === source.id).length,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [quotes, liked]);

  return (
    <div className="relative w-full h-[100dvh] bg-neutral-100 overflow-hidden">
      <Toast message={toast.message} show={toast.show} />
      <TopBar onOpenAccount={() => setShowAccount(true)} />

      {activeTab === 'feed' && status === 'loading' && <FeedLoading />}
      {activeTab === 'feed' && status === 'error' && (
        <FeedError onRetry={() => loadForSource(activeSourceId)} />
      )}
      {activeTab === 'feed' && status === 'ready' && (
        <FeedView
          quotes={quotes}
          liked={liked}
          saved={saved}
          onLike={handleLike}
          onSave={handleSave}
          onShare={handleShare}
          onViewed={handleViewed}
          onReachEnd={handleReachEnd}
          activeSourceId={activeSourceId}
          onResetToDefault={() => setActiveSourceId(DEFAULT_SOURCE_ID)}
        />
      )}

      {activeTab === 'categories' && (
        <CategoriesView activeSourceId={activeSourceId} onSelectSource={handleSelectSource} />
      )}

      {activeTab === 'insights' && (
        <InsightsView
          viewedCount={viewed.size}
          likedCount={liked.size}
          savedCount={saved.size}
          streak={streak}
          sourceBreakdown={sourceBreakdown}
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
