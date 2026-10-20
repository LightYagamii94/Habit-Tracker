import { useState } from 'react';
import { ICON_GROUPS, ICONS } from '../lib/presets';

interface Props {
  value: string;
  onChange: (icon: string) => void;
}

/** Emoji picker with categories, plus a field for any other emoji. */
export function IconPicker({ value, onChange }: Props) {
  const [group, setGroup] = useState(() => Math.max(0, ICON_GROUPS.findIndex((g) => g.icons.includes(value))));

  return (
    <div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]" role="tablist" aria-label="Categorie di icone">
        {ICON_GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            aria-selected={group === i}
            onClick={() => setGroup(i)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors ${
              group === i ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400 ring-1 ring-white/5'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {ICON_GROUPS[group].icons.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            aria-label={`Icona ${icon}`}
            aria-pressed={value === icon}
            className={`grid aspect-square place-items-center rounded-xl text-xl transition-colors ${
              value === icon ? 'bg-zinc-700 ring-2 ring-white/30' : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
      <input
        value={ICONS.includes(value) ? '' : value}
        onChange={(e) => onChange(firstGrapheme(e.target.value))}
        placeholder="…oppure scrivi o incolla qualsiasi emoji"
        aria-label="Emoji personalizzata"
        className="mt-2 h-11 w-full rounded-xl bg-zinc-900 px-3 outline-none ring-1 ring-white/5 placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-400/60"
      />
    </div>
  );
}

function firstGrapheme(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return '';
  const seg = new Intl.Segmenter('it', { granularity: 'grapheme' }).segment(trimmed);
  return seg[Symbol.iterator]().next().value?.segment ?? '';
}
