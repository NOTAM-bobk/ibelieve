import React from 'react';
import { QUOTE_SOURCES } from './quoteSources.js';

/**
 * CategoriesView
 * ------------------------------------------------------------------
 * Renders one tile per entry in QUOTE_SOURCES. This file never needs
 * to change when a new quote type is added — just add an object to
 * QUOTE_SOURCES in quoteSources.js and a tile appears here and in the
 * feed automatically.
 * ------------------------------------------------------------------
 */
export default function CategoriesView({ activeSourceId, onSelectSource }) {
  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-neutral-50 pb-32">
      <div className="px-6 pt-safe pt-24 pb-6">
        <h1 className="text-3xl font-extrabold text-neutral-900">Categories</h1>
        <p className="text-neutral-500 mt-1 font-medium">Pick what you want your feed to show.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 px-6">
        {QUOTE_SOURCES.map((source, i) => {
          const active = activeSourceId === source.id;
          return (
            <button
              key={source.id}
              onClick={() => onSelectSource(source.id)}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`animate-float-in relative overflow-hidden rounded-[28px] p-5 h-40 flex flex-col justify-between text-left shadow-sm active:scale-95 transition-transform bg-gradient-to-br ${source.gradient} ${
                active ? 'ring-4 ring-neutral-900/70' : ''
              }`}
            >
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/25 rounded-full blur-xl" />
              <span className="text-3xl relative">{source.emoji}</span>
              <div className="relative">
                <p className={`font-bold text-lg ${source.text}`}>{source.name}</p>
                <p className={`text-xs font-semibold opacity-70 ${source.text}`}>
                  {source.description}
                </p>
              </div>
              {active && (
                <span className="absolute top-3 right-3 bg-neutral-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                  Active
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
