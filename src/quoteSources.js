/**
 * quoteSources.js
 * ------------------------------------------------------------------
 * Single source of truth for every "type" of quote the app can show.
 * The Categories tab (CategoriesView.jsx) and the feed (App.jsx) both
 * just read this array — to add a new type later, add ONE object
 * below with a fetchOne() that resolves to a plain string. Nothing
 * else in the app needs to change.
 * ------------------------------------------------------------------
 */

async function fetchAffirmation() {
  // Alternates between two affirmation APIs on every call
  const apis = [
    {
      url: 'https://www.affirmations.dev/',
      parse: (d) => (typeof d === 'string' ? d : d?.affirmation),
    },
    {
      url: 'https://woof-affirmations-api.vercel.app/api/affirmation',
      parse: (d) =>
        typeof d === 'string' ? d : d?.affirmation || d?.message || d?.text || d?.data,
    },
  ];
  const api = apis[Math.floor(Math.random() * apis.length)];
  const res = await fetch(api.url, { cache: 'no-store' });
  if (!res.ok) throw new Error('affirmations request failed');
  const data = await res.json();
  const text = api.parse(data);
  if (!text) throw new Error('bad affirmations payload');
  return text.trim();
}

async function fetchChuckNorris() {
  const res = await fetch('https://api.chucknorris.io/jokes/random', { cache: 'no-store' });
  if (!res.ok) throw new Error('chuck norris request failed');
  const data = await res.json();
  if (!data?.value) throw new Error('bad chuck norris payload');
  return data.value.trim();
}

async function fetchKanye() {
  const res = await fetch('https://api.kanye.rest', { cache: 'no-store' });
  if (!res.ok) throw new Error('kanye request failed');
  const data = await res.json();
  if (!data?.quote) throw new Error('bad kanye payload');
  return data.quote.trim();
}

async function fetchAdvice() {
  // cache-busting query param — adviceslip.com otherwise repeats the same slip
  const bust = `${Date.now()}-${Math.random()}`;
  const res = await fetch(`https://api.adviceslip.com/advice?cb=${bust}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('advice request failed');
  const data = await res.json();
  const text = data?.slip?.advice;
  if (!text) throw new Error('bad advice payload');
  return text.trim();
}

export const QUOTE_SOURCES = [
  {
    id: 'affirmations',
    name: 'Affirmations',
    description: 'Uplifting, positive affirmations',
    emoji: '💫',
    gradient: 'from-violet-200 via-purple-100 to-fuchsia-200',
    text: 'text-violet-950',
    chip: 'bg-violet-500',
    fetchOne: fetchAffirmation,
  },
  {
    id: 'chuck-norris',
    name: 'Chuck Norris',
    description: 'Random Chuck Norris facts',
    emoji: '🥋',
    gradient: 'from-red-200 via-orange-100 to-amber-200',
    text: 'text-red-950',
    chip: 'bg-red-600',
    fetchOne: fetchChuckNorris,
  },
  {
    id: 'kanye',
    name: 'Kanye Wisdom',
    description: "Kanye's unfiltered wisdom",
    emoji: '🎤',
    gradient: 'from-slate-200 via-zinc-100 to-neutral-200',
    text: 'text-neutral-900',
    chip: 'bg-neutral-800',
    fetchOne: fetchKanye,
  },
  {
    id: 'advice',
    name: 'Advice',
    description: 'Bite-sized life advice',
    emoji: '🧭',
    gradient: 'from-emerald-200 via-teal-100 to-cyan-200',
    text: 'text-emerald-950',
    chip: 'bg-emerald-600',
    fetchOne: fetchAdvice,
  },

  // 👉 Add more sources here later, e.g.:
  // {
  //   id: 'dad-jokes',
  //   name: 'Dad Jokes',
  //   description: 'Groan-worthy dad jokes',
  //   emoji: '😂',
  //   gradient: 'from-yellow-200 via-lime-100 to-green-200',
  //   text: 'text-yellow-950',
  //   chip: 'bg-yellow-600',
  //   fetchOne: fetchDadJoke,
  // },
];

export function sourceById(id) {
  return QUOTE_SOURCES.find((s) => s.id === id) || QUOTE_SOURCES[0];
}
