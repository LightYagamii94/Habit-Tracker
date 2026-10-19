import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { db } from '../db';
import type { Habit, HabitType, Schedule } from '../types';
import { todayKey, WEEKDAY_SHORT } from '../lib/dates';
import { COLORS, ICONS } from '../lib/presets';
import { createHabit, deleteHabit, setArchived, updateHabit, type HabitInput } from '../data/repo';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconArchive, IconCheck, IconChevronLeft, IconMinus, IconPlus, IconRestore, IconTrash } from '../components/icons';

type ScheduleKind = Schedule['kind'];

interface FormState {
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  target: string;
  unit: string;
  scheduleKind: ScheduleKind;
  days: number[];
  times: number;
  startDate: string;
}

const emptyForm = (): FormState => ({
  name: '',
  icon: ICONS[0],
  color: COLORS[0],
  type: 'boolean',
  target: '1',
  unit: '',
  scheduleKind: 'daily',
  days: [1, 2, 3, 4, 5],
  times: 3,
  startDate: todayKey(),
});

const formFromHabit = (h: Habit): FormState => ({
  ...emptyForm(),
  name: h.name,
  icon: h.icon,
  color: h.color,
  type: h.type,
  target: String(h.target ?? 1),
  unit: h.unit ?? '',
  scheduleKind: h.schedule.kind,
  days: h.schedule.kind === 'weekdays' ? h.schedule.days : [1, 2, 3, 4, 5],
  times: h.schedule.kind === 'timesPerWeek' ? h.schedule.times : 3,
  startDate: h.startDate,
});

const TYPES: { value: HabitType; title: string; hint: string }[] = [
  { value: 'boolean', title: 'Sì/No', hint: 'Fatto o non fatto' },
  { value: 'quantity', title: 'Quantità', hint: 'Con un obiettivo' },
  { value: 'negative', title: 'Da evitare', hint: 'Conta le ricadute' },
];

const SCHEDULES: { value: ScheduleKind; title: string }[] = [
  { value: 'daily', title: 'Ogni giorno' },
  { value: 'weekdays', title: 'Giorni fissi' },
  { value: 'timesPerWeek', title: 'N a settimana' },
];

export function HabitFormPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState<FormState | null>(isNew ? emptyForm() : null);
  const [habit, setHabit] = useState<Habit | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    void db.habits.get(id).then((h) => {
      if (!h) return setNotFound(true);
      setHabit(h);
      setForm(formFromHabit(h));
    });
  }, [id, isNew]);

  const goBack = () =>
    location.key !== 'default' ? navigate(-1) : navigate(isNew ? '/' : `/abitudini/${id}`, { replace: true });

  if (notFound) {
    return (
      <div className="pt-10 text-center text-zinc-400">
        Abitudine non trovata.
        <button onClick={() => navigate('/abitudini')} className="mt-4 block w-full text-emerald-400">
          Torna alle abitudini
        </button>
      </div>
    );
  }
  if (!form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const toggleDay = (d: number) =>
    set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d].sort());

  const selectType = (t: HabitType) => {
    setForm((f) =>
      f ? { ...f, type: t, scheduleKind: t === 'negative' && f.scheduleKind === 'timesPerWeek' ? 'daily' : f.scheduleKind } : f,
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError('Dai un nome alla tua abitudine.');
    const target = Number(form.target.replace(',', '.'));
    if (form.type === 'quantity' && !(target > 0)) return setError("L'obiettivo deve essere maggiore di zero.");
    if (form.scheduleKind === 'weekdays' && form.days.length === 0) return setError('Scegli almeno un giorno.');

    const schedule: Schedule =
      form.scheduleKind === 'weekdays'
        ? { kind: 'weekdays', days: form.days }
        : form.scheduleKind === 'timesPerWeek'
          ? { kind: 'timesPerWeek', times: form.times }
          : { kind: 'daily' };

    const input: HabitInput = {
      name,
      icon: form.icon.trim() || ICONS[0],
      color: form.color,
      type: form.type,
      target: form.type === 'quantity' ? target : undefined,
      unit: form.type === 'quantity' ? form.unit.trim() : undefined,
      schedule,
      startDate: form.startDate || todayKey(),
    };

    if (isNew) await createHabit(input);
    else await updateHabit(id, input);
    goBack();
  };

  const archived = habit?.archivedAt != null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <header className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={goBack}
          className="grid size-10 place-items-center rounded-full bg-zinc-900 ring-1 ring-white/5"
          aria-label="Indietro"
        >
          <IconChevronLeft />
        </button>
        <h1 className="text-lg font-semibold">{isNew ? 'Nuova abitudine' : 'Modifica'}</h1>
        <button type="submit" className="h-10 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950">
          Salva
        </button>
      </header>

      <div className="flex items-center gap-3">
        <span
          className="grid size-16 shrink-0 place-items-center rounded-3xl text-4xl transition-colors"
          style={{ backgroundColor: `${form.color}22`, boxShadow: `inset 0 0 0 1px ${form.color}55` }}
        >
          {form.icon || '❓'}
        </span>
        <input
          value={form.name}
          onChange={(e) => {
            set('name', e.target.value);
            setError(null);
          }}
          placeholder="Es. Bere acqua"
          maxLength={40}
          autoFocus={isNew}
          aria-label="Nome"
          className="h-14 min-w-0 flex-1 rounded-2xl bg-zinc-900 px-4 text-lg font-medium outline-none ring-1 ring-white/5 placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-400/60"
        />
      </div>

      <Field label="Icona">
        <div className="grid grid-cols-8 gap-1.5">
          {ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => set('icon', icon)}
              className={`grid aspect-square place-items-center rounded-xl text-xl transition-colors ${
                form.icon === icon ? 'bg-zinc-700 ring-2 ring-white/30' : 'bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
        <input
          value={ICONS.includes(form.icon) ? '' : form.icon}
          onChange={(e) => set('icon', firstGrapheme(e.target.value))}
          placeholder="…oppure scrivi un'emoji"
          aria-label="Emoji personalizzata"
          className="mt-2 h-11 w-full rounded-xl bg-zinc-900 px-3 outline-none ring-1 ring-white/5 placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-400/60"
        />
      </Field>

      <Field label="Colore">
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              aria-label={`Colore ${c}`}
              aria-pressed={form.color === c}
              className="grid size-9 place-items-center rounded-full transition-transform active:scale-90"
              style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 3px #09090b, 0 0 0 5px ${c}` : undefined }}
            >
              {form.color === c && <IconCheck className="size-4 text-zinc-950" />}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Tipo" hint={isNew ? undefined : 'Il tipo non si può cambiare dopo la creazione.'}>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={!isNew}
              onClick={() => selectType(t.value)}
              className={`rounded-2xl p-3 text-left transition-colors disabled:cursor-not-allowed ${
                form.type === t.value
                  ? 'bg-emerald-400/10 ring-2 ring-emerald-400/70'
                  : 'bg-zinc-900 ring-1 ring-white/5 hover:bg-zinc-800 disabled:opacity-40'
              }`}
            >
              <span className="block text-sm font-semibold">{t.title}</span>
              <span className="block text-xs text-zinc-500">{t.hint}</span>
            </button>
          ))}
        </div>
      </Field>

      {form.type === 'quantity' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Obiettivo al giorno">
            <input
              value={form.target}
              onChange={(e) => {
                set('target', e.target.value);
                setError(null);
              }}
              inputMode="decimal"
              className="h-12 w-full rounded-2xl bg-zinc-900 px-4 font-medium outline-none ring-1 ring-white/5 focus:ring-2 focus:ring-emerald-400/60"
            />
          </Field>
          <Field label="Unità">
            <input
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
              placeholder="bicchieri, min…"
              maxLength={20}
              className="h-12 w-full rounded-2xl bg-zinc-900 px-4 font-medium outline-none ring-1 ring-white/5 placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-400/60"
            />
          </Field>
        </div>
      )}

      <Field label="Frequenza">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-900 p-1 ring-1 ring-white/5">
          {SCHEDULES.filter((s) => !(form.type === 'negative' && s.value === 'timesPerWeek')).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                set('scheduleKind', s.value);
                setError(null);
              }}
              className={`h-10 rounded-xl text-sm font-medium transition-colors ${
                form.scheduleKind === s.value ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>

        {form.scheduleKind === 'weekdays' && (
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {WEEKDAY_SHORT.map((label, i) => {
              const d = i + 1;
              const on = form.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    toggleDay(d);
                    setError(null);
                  }}
                  aria-pressed={on}
                  className={`h-11 rounded-xl text-xs font-semibold transition-colors ${
                    on ? 'text-zinc-950' : 'bg-zinc-900 text-zinc-400 ring-1 ring-white/5'
                  }`}
                  style={on ? { backgroundColor: form.color } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {form.scheduleKind === 'timesPerWeek' && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-zinc-900 p-2 pl-4 ring-1 ring-white/5">
            <span className="font-medium">
              {form.times} {form.times === 1 ? 'volta' : 'volte'} a settimana
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => set('times', Math.max(1, form.times - 1))}
                disabled={form.times <= 1}
                aria-label="Meno volte"
                className="grid size-10 place-items-center rounded-full bg-zinc-800 disabled:opacity-30"
              >
                <IconMinus />
              </button>
              <button
                type="button"
                onClick={() => set('times', Math.min(6, form.times + 1))}
                disabled={form.times >= 6}
                aria-label="Più volte"
                className="grid size-10 place-items-center rounded-full bg-zinc-800 disabled:opacity-30"
              >
                <IconPlus />
              </button>
            </div>
          </div>
        )}
      </Field>

      <Field label="Data di inizio" hint="Scegli una data passata per registrare anche i giorni precedenti.">
        <input
          type="date"
          value={form.startDate}
          onChange={(e) => set('startDate', e.target.value)}
          className="h-12 w-full rounded-2xl bg-zinc-900 px-4 font-medium outline-none ring-1 ring-white/5 focus:ring-2 focus:ring-emerald-400/60"
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="h-14 w-full rounded-2xl bg-emerald-400 text-base font-semibold text-zinc-950 hover:bg-emerald-300"
      >
        {isNew ? 'Crea abitudine' : 'Salva modifiche'}
      </button>

      {!isNew && habit && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              await setArchived(habit.id, archived ? null : todayKey());
              goBack();
            }}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-sm font-medium text-zinc-300 ring-1 ring-white/5"
          >
            {archived ? <IconRestore /> : <IconArchive />}
            {archived ? 'Ripristina' : 'Archivia'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-sm font-medium text-rose-400 ring-1 ring-white/5"
          >
            <IconTrash />
            Elimina
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminare l'abitudine?"
        message="Verranno cancellati anche tutti i dati registrati. Se vuoi solo nasconderla, usa Archivia."
        confirmLabel="Elimina"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!habit) return;
          await deleteHabit(habit.id);
          navigate('/abitudini', { replace: true });
        }}
      />
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-1 text-sm font-medium text-zinc-400">{label}</p>
      {children}
      {hint && <p className="mt-1.5 px-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function firstGrapheme(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return '';
  const seg = new Intl.Segmenter('it', { granularity: 'grapheme' }).segment(trimmed);
  return seg[Symbol.iterator]().next().value?.segment ?? '';
}
