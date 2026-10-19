import { useState } from 'react';
import type { Habit } from '../types';
import { IconMinus, IconPlus } from './icons';

interface Props {
  habit: Habit;
  title: string;
  initial: number;
  onSave: (value: number) => void;
  onClose: () => void;
}

export function QuantityDialog({ habit, title, initial, onSave, onClose }: Props) {
  const [raw, setRaw] = useState(String(initial));
  const value = Number(raw.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 0;
  const step = (delta: number) => setRaw(String(Math.max(0, (valid ? value : 0) + delta)));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qty-title"
        className="w-full max-w-sm rounded-3xl bg-zinc-900 p-5 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="qty-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-zinc-400">
          Obiettivo: {habit.target} {habit.unit}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => step(-1)}
            aria-label="Diminuisci"
            className="grid size-12 place-items-center rounded-full bg-zinc-800 active:scale-90"
          >
            <IconMinus />
          </button>
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="decimal"
            aria-label="Valore"
            className="h-14 w-24 rounded-2xl bg-zinc-800 text-center text-2xl font-bold outline-none"
            style={{ boxShadow: `inset 0 0 0 2px ${valid ? habit.color : '#f43f5e'}` }}
          />
          <button
            onClick={() => step(1)}
            aria-label="Aumenta"
            className="grid size-12 place-items-center rounded-full active:scale-90"
            style={{ backgroundColor: habit.color, color: '#09090b' }}
          >
            <IconPlus />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="h-12 rounded-2xl bg-zinc-800 font-medium hover:bg-zinc-700">
            Annulla
          </button>
          <button
            disabled={!valid}
            onClick={() => onSave(value)}
            className="h-12 rounded-2xl bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-40"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
