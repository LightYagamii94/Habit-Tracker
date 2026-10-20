import { useEffect, useRef, useState } from 'react';
import { db } from '../db';
import type { DateKey } from '../types';
import { saveNote } from '../data/repo';
import { MOODS } from '../lib/insights';
import { vibrate } from '../lib/presets';

/** Mood and a short note for one day. Mount it with key={date}. */
export function DayNoteCard({ date }: { date: DateKey }) {
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<number | undefined>();
  const [saved, setSaved] = useState(false);
  const latest = useRef({ text, mood, dirty: false });
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void db.notes.get(date).then((n) => {
      if (!alive) return;
      setText(n?.text ?? '');
      setMood(n?.mood);
      latest.current = { text: n?.text ?? '', mood: n?.mood, dirty: false };
      setLoaded(true);
    });
    return () => {
      alive = false;
      // Save pending text when leaving the day.
      window.clearTimeout(timer.current);
      if (latest.current.dirty) void saveNote(date, latest.current.text, latest.current.mood);
    };
  }, [date]);

  const flush = () => {
    window.clearTimeout(timer.current);
    if (!latest.current.dirty) return;
    latest.current.dirty = false;
    void saveNote(date, latest.current.text, latest.current.mood).then(() => setSaved(true));
  };

  const update = (next: { text?: string; mood?: number | undefined }, immediate: boolean) => {
    latest.current = { ...latest.current, ...next, dirty: true };
    setSaved(false);
    window.clearTimeout(timer.current);
    if (immediate) flush();
    else timer.current = window.setTimeout(flush, 600);
  };

  if (!loaded) return null;

  return (
    <section className="rounded-3xl bg-zinc-900 p-4 ring-1 ring-white/5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Com'è andata?</h2>
        {saved && <span className="text-xs text-zinc-500">Salvato</span>}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Umore">
        {MOODS.map((m) => {
          const on = mood === m.value;
          return (
            <button
              key={m.value}
              role="radio"
              aria-checked={on}
              aria-label={m.label}
              onClick={() => {
                vibrate();
                const next = on ? undefined : m.value;
                setMood(next);
                update({ mood: next }, true);
              }}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition-all active:scale-95 ${
                on ? 'bg-violet-400/15 ring-2 ring-violet-400/60' : 'bg-zinc-800/60'
              }`}
            >
              <span className={`text-2xl transition-opacity ${mood !== undefined && !on ? 'opacity-40' : ''}`}>
                {m.emoji}
              </span>
              <span className="text-[10px] text-zinc-400">{m.label}</span>
            </button>
          );
        })}
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          update({ text: e.target.value }, false);
        }}
        onBlur={flush}
        placeholder="Una nota sulla giornata…"
        rows={3}
        maxLength={1000}
        aria-label="Nota del giorno"
        className="mt-3 w-full resize-none rounded-2xl bg-zinc-800/60 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-violet-400/50"
      />
    </section>
  );
}
