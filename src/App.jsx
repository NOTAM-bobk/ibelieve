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
  Shuffle,
} from 'lucide-react';
import AccountView from './AccountView.jsx';
import CategoriesView from './CategoriesView.jsx';
import { QUOTE_SOURCES, sourceById } from './quoteSources.js';

let idCounter = 1;
const nextId = () => idCounter++;

const DEFAULT_SOURCE_ID = QUOTE_SOURCES[0].id;

async function fetchBatch(count, existingTexts, sourceIds) {
  const pool = sourceIds && sourceIds.length ? sourceIds : [DEFAULT_SOURCE_ID];
  const seen = new Set(existingTexts);
  const results = await Promise.allSettled(
    Array.from({ length: count }, () => {
      const pickedId = pool[Math.floor(Math.random() * pool.length)];
      const source = sourceById(pickedId);
      return source.fetchOne().then((text) => ({ text, sourceId: pickedId }));
    })
  );
  const fresh = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value?.text && !seen.has(r.value.text)) {
      seen.add(r.value.text);
      fresh.push({ id: nextId(), text: r.value.text, sourceId: r.value.sourceId });
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
  sources: 'ibelieve.sources.v1',
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
        <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full pointer-events-auto">
          <Sparkles size={14} className="text-white" />
          <span className="text-xs font-bold text-white">ibelieve</span>
        </div>
        <button
          onClick={onOpenAccount}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform pointer-events-auto"
          aria-label="Open account"
        >
          <User size={18} className="text-white" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feed Card — full-screen, editorial: serif quote, left-aligned,      */
/* oversized quotation mark, minimal outlined action buttons            */
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
      className={`relative h-[100dvh] w-full snap-start snap-always flex flex-col justify-center overflow-hidden bg-gradient-to-br ${source.gradient}`}
    >
      {/* depth vignette so white text and icons always read clearly */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35 pointer-events-none" />

      {/* oversized decorative quotation mark, editorial texture rather than a flat gradient */}
      <span
        aria-hidden="true"
        className="absolute -top-10 left-2 text-white/10 select-none pointer-events-none leading-none"
        style={{ fontFamily: 'Fraunces, serif', fontSize: '15rem' }}
      >
        &ldquo;
      </span>

      {/* category label, top-left, small tracked caption instead of a pill badge */}
      <div className="absolute top-24 left-6 flex items-center gap-2 animate-float-in">
        <span className="text-base">{source.emoji}</span>
        <span className={`text-[11px] font-bold tracking-[0.22em] uppercase ${source.accent}`}>
          {source.name}
        </span>
      </div>
      <div className={`absolute top-[7.5rem] left-6 w-8 h-[3px] rounded-full ${source.chip} animate-float-in`} />

      {/* main quote — serif, left-aligned, generous leading */}
      <div key={quote.id} className="relative z-10 px-6 sm:px-10 max-w-xl animate-float-in">
        <p
          style={{ fontFamily: 'Fraunces, serif' }}
          className="text-[2rem] sm:text-4xl font-medium leading-[1.2] tracking-tight text-white"
        >
          {quote.text}
        </p>
      </div>

      {/* minimal outlined action buttons, no labels, tucked bottom-right */}
      <div className="absolute right-5 bottom-32 flex flex-col items-center gap-3.5 z-10">
        <button onClick={handleLike} className="active:scale-90 transition-transform duration-200">
          <div
            className={`w-11 h-11 rounded-full border flex items-center justify-center backdrop-blur-sm transition-colors duration-200 ${
              isLiked ? 'bg-white/90 border-white' : 'bg-white/10 border-white/30'
            } ${heartPop ? 'animate-pop' : ''}`}
          >
            <Heart
              size={18}
              className={isLiked ? `${source.accentText} fill-current` : 'text-white'}
              strokeWidth={2}
            />
          </div>
        </button>

        <button onClick={handleSave} className="active:scale-90 transition-transform duration-200">
          <div
            className={`w-11 h-11 rounded-full border flex items-center justify-center backdrop-blur-sm transition-colors duration-200 ${
              isSaved ? 'bg-white/90 border-white' : 'bg-white/10 border-white/30'
            } ${saveBounce ? 'animate-pop' : ''}`}
          >
            <Bookmark
              size={16}
              className={isSaved ? `${source.accentText} fill-current` : 'text-white'}
              strokeWidth={2}
            />
          </div>
        </button>

        <button
          onClick={() => onShare(quote.text)}
          className="active:scale-90 transition-transform duration-200"
        >
          <div className="w-11 h-11 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 size={16} className="text-white" strokeWidth={2} />
          </div>
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
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-[#3b0764] via-[#5b21b6] to-[#7c3aed] px-8 text-center gap-4">
      <Loader2 size={30} className="text-white animate-spin-slow" />
      <p className="text-white/80 font-semibold">Fetching fresh quotes…</p>
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
  selectedCount,
  onOpenCategories,
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

  return (
    <div className="relative h-[100dvh] w-full">
      {selectedCount > 1 && (
        <button
          onClick={onOpenCategories}
          className="absolute top-24 right-5 z-20 flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white text-xs font-bold pl-2.5 pr-3 py-1.5 rounded-full active:scale-95 transition-transform"
        >
          <Shuffle size={13} /> {selectedCount} mixed
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
/* Bottom Navigation — tight, small icons, active tab = round pill      */
/* (Google Play Store style)                                            */
/* ------------------------------------------------------------------ */

function BottomNav({ activeTab, setActiveTab }) {
  const items = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'categories', label: 'Categories', icon: Shapes },
    { id: 'insights', label: 'Insights', icon: Gift },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe">
      <div className="bg-white/95 backdrop-blur-xl border-t border-neutral-100 px-2 pt-2 pb-1.5 flex items-center justify-around">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  active ? 'bg-violet-100' : 'bg-transparent'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={2.4}
                  className={`transition-colors duration-300 ${
                    active ? 'text-violet-700' : 'text-neutral-400'
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-bold transition-colors duration-300 ${
                  active ? 'text-neutral-900' : 'text-neutral-400'
                }`}
              >
                {label}
              </span>
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

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedSourceIds, setSelectedSourceIds] = useState(() =>
    loadJSON(STORAGE_KEYS.sources, [DEFAULT_SOURCE_ID])
  );
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
  const sourceKey = selectedSourceIds.slice().sort().join(',');

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
  useEffect(() => saveJSON(STORAGE_KEYS.sources, selectedSourceIds), [selectedSourceIds]);

  const loadForSources = useCallback(async (ids) => {
    setStatus('loading');
    setQuotes([]);
    try {
      const batch = await fetchBatch(INITIAL_BATCH, [], ids);
      if (batch.length === 0) throw new Error('No quotes returned');
      setQuotes(batch);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadForSources(selectedSourceIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 1800);
  }, []);

  const handleReachEnd = useCallback(() => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setQuotes((current) => {
      fetchBatch(LOAD_MORE_BATCH, current.map((q) => q.text), selectedSourceIds)
        .then((fresh) => {
          if (fresh.length) setQuotes((prev) => [...prev, ...fresh]);
        })
        .finally(() => {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        });
      return current;
    });
  }, [selectedSourceIds]);

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

  const handleToggleSource = useCallback(
    (id) => {
      setSelectedSourceIds((prev) => {
        const has = prev.includes(id);
        if (has) {
          if (prev.length === 1) {
            showToast('Keep at least one category selected');
            return prev;
          }
          return prev.filter((s) => s !== id);
        }
        return [...prev, id];
      });
    },
    [showToast]
  );

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
        <FeedError onRetry={() => loadForSources(selectedSourceIds)} />
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
          selectedCount={selectedSourceIds.length}
          onOpenCategories={() => setActiveTab('categories')}
        />
      )}

      {activeTab === 'categories' && (
        <CategoriesView selectedIds={selectedSourceIds} onToggleSource={handleToggleSource} />
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-md">
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
