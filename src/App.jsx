import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  Bookmark,
  Share2,
  Home,
  Compass,
  BarChart3,
  Flame,
  Sparkles,
  X,
  Check,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Mock / Static Data                                                  */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  {
    id: 'self-love',
    name: 'Self Love',
    emoji: '💖',
    gradient: 'from-pink-200 via-rose-200 to-fuchsia-200',
    solid: 'bg-rose-100',
    text: 'text-rose-950',
    chip: 'bg-rose-500',
  },
  {
    id: 'success',
    name: 'Success',
    emoji: '🚀',
    gradient: 'from-amber-200 via-yellow-100 to-orange-200',
    solid: 'bg-amber-100',
    text: 'text-amber-950',
    chip: 'bg-amber-500',
  },
  {
    id: 'anxiety',
    name: 'Calm & Anxiety',
    emoji: '🌊',
    gradient: 'from-sky-200 via-cyan-100 to-blue-200',
    solid: 'bg-sky-100',
    text: 'text-sky-950',
    chip: 'bg-sky-500',
  },
  {
    id: 'gratitude',
    name: 'Gratitude',
    emoji: '🙏',
    gradient: 'from-emerald-200 via-green-100 to-teal-200',
    solid: 'bg-emerald-100',
    text: 'text-emerald-950',
    chip: 'bg-emerald-500',
  },
  {
    id: 'confidence',
    name: 'Confidence',
    emoji: '⚡',
    gradient: 'from-violet-200 via-purple-100 to-indigo-200',
    solid: 'bg-violet-100',
    text: 'text-violet-950',
    chip: 'bg-violet-500',
  },
  {
    id: 'motivation',
    name: 'Motivation',
    emoji: '🔥',
    gradient: 'from-red-200 via-orange-100 to-rose-200',
    solid: 'bg-red-100',
    text: 'text-red-950',
    chip: 'bg-red-500',
  },
];

const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

let idCounter = 1;
const nextId = () => idCounter++;

const SEED_AFFIRMATIONS = [
  { text: 'I am worthy of love and respect, exactly as I am.', categoryId: 'self-love' },
  { text: 'I treat myself with the same kindness I offer others.', categoryId: 'self-love' },
  { text: 'My body and mind deserve patience and care.', categoryId: 'self-love' },
  { text: 'I am proud of who I am becoming.', categoryId: 'self-love' },

  { text: 'Every step I take moves me closer to my goals.', categoryId: 'success' },
  { text: 'I am capable of building the life I imagine.', categoryId: 'success' },
  { text: 'Opportunities flow easily into my life.', categoryId: 'success' },
  { text: 'I turn challenges into stepping stones.', categoryId: 'success' },

  { text: 'This feeling is temporary; I am safe right now.', categoryId: 'anxiety' },
  { text: 'I breathe in calm and breathe out tension.', categoryId: 'anxiety' },
  { text: 'I release what I cannot control.', categoryId: 'anxiety' },
  { text: 'My mind is quiet, my heart is steady.', categoryId: 'anxiety' },

  { text: 'I am grateful for this new day and its quiet gifts.', categoryId: 'gratitude' },
  { text: 'Even small joys deserve my full attention.', categoryId: 'gratitude' },
  { text: 'I notice the good that surrounds me.', categoryId: 'gratitude' },
  { text: 'Gratitude turns what I have into enough.', categoryId: 'gratitude' },

  { text: 'I trust my own voice and my own judgment.', categoryId: 'confidence' },
  { text: 'I walk into every room as I am — and that is enough.', categoryId: 'confidence' },
  { text: 'I am not afraid to take up space.', categoryId: 'confidence' },
  { text: 'My confidence grows every time I try.', categoryId: 'confidence' },

  { text: 'I have the energy to chase what matters to me.', categoryId: 'motivation' },
  { text: 'Today, I choose progress over perfection.', categoryId: 'motivation' },
  { text: 'I am one decision away from a different life.', categoryId: 'motivation' },
  { text: 'Small consistent actions build unstoppable momentum.', categoryId: 'motivation' },
].map((a) => ({ ...a, id: nextId() }));

/* ------------------------------------------------------------------ */
/* API Helper                                                          */
/* ------------------------------------------------------------------ */

async function fetchApiAffirmation() {
  const res = await fetch('https://www.affirmations.dev/');
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  return data.affirmation;
}

async function fetchApiAffirmations(count = 8) {
  const results = await Promise.allSettled(
    Array.from({ length: count }, () => fetchApiAffirmation())
  );
  return results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => ({
      id: nextId(),
      text: r.value,
      categoryId: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].id,
    }));
}

/* ------------------------------------------------------------------ */
/* Toast (tiny inline notification, no extra deps)                     */
/* ------------------------------------------------------------------ */

function Toast({ message, show }) {
  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 bg-neutral-900/90 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md">
        <Check size={16} className="text-emerald-400" />
        {message}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feed Card                                                           */
/* ------------------------------------------------------------------ */

function FeedCard({ affirmation, isLiked, isSaved, onLike, onSave, onShare, registerRef }) {
  const cat = categoryById(affirmation.categoryId);
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) registerRef(affirmation.id, cardRef.current);
  }, [affirmation.id, registerRef]);

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
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <span
          className={`${cat.chip} text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5`}
        >
          <span>{cat.emoji}</span>
          {cat.name}
        </span>
      </div>

      {/* main text */}
      <div className="relative px-8 max-w-md text-center">
        <p className={`text-3xl sm:text-4xl font-bold leading-snug ${cat.text}`}>
          {affirmation.text}
        </p>
      </div>

      {/* floating action buttons, TikTok-style */}
      <div className="absolute right-4 bottom-28 flex flex-col items-center gap-6">
        <button
          onClick={() => onLike(affirmation.id)}
          className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
        >
          <div
            className={`w-14 h-14 rounded-3xl flex items-center justify-center backdrop-blur-md shadow-lg transition-all ${
              isLiked ? 'bg-rose-500' : 'bg-white/40 group-hover:bg-white/60'
            }`}
          >
            <Heart
              size={26}
              className={isLiked ? 'text-white fill-white' : `${cat.text}`}
              strokeWidth={2}
            />
          </div>
          <span className={`text-xs font-semibold ${cat.text}`}>Like</span>
        </button>

        <button
          onClick={() => onSave(affirmation.id)}
          className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
        >
          <div
            className={`w-14 h-14 rounded-3xl flex items-center justify-center backdrop-blur-md shadow-lg transition-all ${
              isSaved ? 'bg-indigo-500' : 'bg-white/40 group-hover:bg-white/60'
            }`}
          >
            <Bookmark
              size={24}
              className={isSaved ? 'text-white fill-white' : `${cat.text}`}
              strokeWidth={2}
            />
          </div>
          <span className={`text-xs font-semibold ${cat.text}`}>Save</span>
        </button>

        <button
          onClick={() => onShare(affirmation.text)}
          className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
        >
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center backdrop-blur-md shadow-lg bg-white/40 group-hover:bg-white/60 transition-all">
            <Share2 size={24} className={cat.text} strokeWidth={2} />
          </div>
          <span className={`text-xs font-semibold ${cat.text}`}>Share</span>
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Feed View                                                           */
/* ------------------------------------------------------------------ */

function FeedView({
  affirmations,
  liked,
  saved,
  onLike,
  onSave,
  onShare,
  onViewed,
  activeCategory,
  onClearFilter,
}) {
  const containerRef = useRef(null);
  const cardRefs = useRef(new Map());

  const registerRef = useCallback((id, el) => {
    cardRefs.current.set(id, el);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const id = Number(entry.target.dataset.id);
            onViewed(id);
          }
        });
      },
      { threshold: [0.6] }
    );
    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [affirmations, onViewed]);

  if (affirmations.length === 0) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-neutral-100 px-8 text-center gap-4">
        <Sparkles className="text-neutral-400" size={40} />
        <p className="text-neutral-500 font-medium">No affirmations in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full">
      {activeCategory && (
        <button
          onClick={onClearFilter}
          className="absolute top-6 left-4 z-20 flex items-center gap-1.5 bg-white/70 backdrop-blur-md text-neutral-800 text-xs font-semibold pl-2 pr-3 py-1.5 rounded-full shadow-md"
        >
          <X size={14} /> Clear filter
        </button>
      )}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {affirmations.map((a) => (
          <FeedCard
            key={a.id}
            affirmation={a}
            isLiked={liked.has(a.id)}
            isSaved={saved.has(a.id)}
            onLike={onLike}
            onSave={onSave}
            onShare={onShare}
            registerRef={registerRef}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Explore View                                                        */
/* ------------------------------------------------------------------ */

function ExploreView({ onSelectCategory, counts }) {
  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-neutral-50 pb-28 pt-safe">
      <div className="px-6 pt-10 pb-6">
        <h1 className="text-3xl font-extrabold text-neutral-900">Explore</h1>
        <p className="text-neutral-500 mt-1">Pick a mood to focus your feed on.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 px-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`relative overflow-hidden rounded-[28px] p-5 h-40 flex flex-col justify-between text-left shadow-sm active:scale-95 transition-transform bg-gradient-to-br ${cat.gradient}`}
          >
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/25 rounded-full blur-xl" />
            <span className="text-3xl relative">{cat.emoji}</span>
            <div className="relative">
              <p className={`font-bold text-lg ${cat.text}`}>{cat.name}</p>
              <p className={`text-xs font-medium opacity-70 ${cat.text}`}>
                {counts[cat.id] || 0} affirmations
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights View                                                       */
/* ------------------------------------------------------------------ */

function InsightsView({ viewedCount, likedCount, savedCount, categoryBreakdown }) {
  const maxCount = Math.max(1, ...categoryBreakdown.map((c) => c.count));

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-neutral-50 pb-28">
      <div className="px-6 pt-10 pb-6">
        <h1 className="text-3xl font-extrabold text-neutral-900">Your Journey</h1>
        <p className="text-neutral-500 mt-1">A little snapshot of your mindfulness habit.</p>
      </div>

      {/* Streak card */}
      <div className="mx-6 rounded-[28px] bg-gradient-to-br from-orange-300 via-amber-200 to-yellow-200 p-6 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-amber-900/70 font-semibold text-sm">Current Streak</p>
          <p className="text-4xl font-extrabold text-amber-950 mt-1">7 days</p>
          <p className="text-amber-900/70 text-xs mt-1 font-medium">Keep it going!</p>
        </div>
        <div className="w-16 h-16 bg-white/40 rounded-3xl flex items-center justify-center">
          <Flame size={32} className="text-amber-950" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mx-6 mt-4">
        <div className="rounded-[24px] bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-neutral-900">{viewedCount}</p>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">Viewed</p>
        </div>
        <div className="rounded-[24px] bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-rose-500">{likedCount}</p>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">Liked</p>
        </div>
        <div className="rounded-[24px] bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-extrabold text-indigo-500">{savedCount}</p>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">Saved</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="mx-6 mt-6 rounded-[28px] bg-white p-6 shadow-sm">
        <p className="font-bold text-neutral-900 mb-4">Top Categories</p>
        <div className="flex flex-col gap-4">
          {categoryBreakdown.map((c) => {
            const cat = categoryById(c.id);
            return (
              <div key={c.id}>
                <div className="flex justify-between text-sm font-medium mb-1.5">
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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom Navigation                                                    */
/* ------------------------------------------------------------------ */

function BottomNav({ activeTab, setActiveTab }) {
  const items = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="flex items-center justify-around bg-white/60 backdrop-blur-xl border border-white/40 rounded-[28px] shadow-xl px-2 py-2">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-300 ${
                active ? 'bg-neutral-900 text-white scale-105' : 'text-neutral-500'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-semibold">{label}</span>
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

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [affirmations, setAffirmations] = useState(SEED_AFFIRMATIONS);
  const [activeCategory, setActiveCategory] = useState(null);
  const [liked, setLiked] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const [viewed, setViewed] = useState(new Set());
  const [toast, setToast] = useState({ show: false, message: '' });

  // Pull fresh affirmations from the public API on load
  useEffect(() => {
    let cancelled = false;
    fetchApiAffirmations(8)
      .then((fresh) => {
        if (!cancelled && fresh.length) {
          setAffirmations((prev) => [...prev, ...fresh]);
        }
      })
      .catch(() => {
        /* silently fall back to seed data */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 1800);
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
        /* user cancelled share sheet — ignore */
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

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = affirmations.filter((a) => a.categoryId === cat.id).length;
    return acc;
  }, {});

  const categoryBreakdown = CATEGORIES.map((cat) => ({
    id: cat.id,
    count: affirmations.filter((a) => liked.has(a.id) && a.categoryId === cat.id).length,
  }))
    .sort((a, b) => b.count - a.count)
    .filter((c) => c.count > 0);

  const finalBreakdown =
    categoryBreakdown.length > 0
      ? categoryBreakdown
      : CATEGORIES.slice(0, 4).map((cat) => ({ id: cat.id, count: 0 }));

  return (
    <div className="relative w-full h-[100dvh] bg-neutral-100 overflow-hidden">
      <Toast message={toast.message} show={toast.show} />

      {activeTab === 'feed' && (
        <FeedView
          affirmations={displayedAffirmations}
          liked={liked}
          saved={saved}
          onLike={handleLike}
          onSave={handleSave}
          onShare={handleShare}
          onViewed={handleViewed}
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
          categoryBreakdown={finalBreakdown}
        />
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
