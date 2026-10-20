import type { CSSProperties } from 'react';
import type { DateKey, Habit } from '../types';
import { addMonthsKey, dayOfMonth, formatMonth, monthGrid, monthStartKey, WEEKDAY_LETTERS } from '../lib/dates';
import { hasLimit, isActiveOn, isDone, isScheduledOn } from '../lib/habits';
import { rulesOn } from '../lib/rules';
import { IconChevronLeft, IconChevronRight } from './icons';

interface Props {
  habit: Habit;
  values: Map<DateKey, number>;
  month: DateKey;
  today: DateKey;
  onMonthChange: (m: DateKey) => void;
  onDayClick: (d: DateKey) => void;
}

export function MonthCalendar({ habit, values, month, today, onMonthChange, onDayClick }: Props) {
  const canGoBack = monthStartKey(month) > monthStartKey(habit.startDate);
  const canGoNext = monthStartKey(month) < monthStartKey(today);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onMonthChange(addMonthsKey(month, -1))}
          disabled={!canGoBack}
          aria-label="Mese precedente"
          className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 disabled:opacity-20"
        >
          <IconChevronLeft />
        </button>
        <span className="font-semibold">{formatMonth(month)}</span>
        <button
          onClick={() => onMonthChange(addMonthsKey(month, 1))}
          disabled={!canGoNext}
          aria-label="Mese successivo"
          className="grid size-9 place-items-center rounded-full text-zinc-400 hover:bg-zinc-800 disabled:opacity-20"
        >
          <IconChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LETTERS.map((l, i) => (
          <span key={i} className="pb-1 text-[11px] font-medium text-zinc-500">
            {l}
          </span>
        ))}
        {monthGrid(month).map((d, i) =>
          d === null ? <span key={i} /> : <DayCell key={d} habit={habit} date={d} value={values.get(d) ?? 0} today={today} onClick={onDayClick} />,
        )}
      </div>
    </div>
  );
}

function DayCell({
  habit: base,
  date,
  value,
  today,
  onClick,
}: {
  habit: Habit;
  date: DateKey;
  value: number;
  today: DateKey;
  onClick: (d: DateKey) => void;
}) {
  const habit = rulesOn(base, date); // each day with the rules in force then
  const editable = date <= today && isActiveOn(habit, date);
  const scheduled = isScheduledOn(habit, date);
  const done = isDone(habit, value);
  const isToday = date === today;

  let className = 'text-zinc-700';
  let style: CSSProperties | undefined;
  let state = 'non disponibile';

  if (editable) {
    if (habit.type === 'negative' && !done) {
      className = 'bg-rose-500/20 text-rose-300';
      state = hasLimit(habit) ? `${value}, oltre il limite` : 'ricaduta';
    } else if (done) {
      className = 'font-semibold text-zinc-950';
      style = { backgroundColor: habit.color };
      state = habit.type === 'negative' ? (hasLimit(habit) ? `${value}, entro il limite` : 'nessuna ricaduta') : 'fatto';
    } else if (habit.type === 'quantity' && value > 0) {
      const ratio = Math.min(1, value / (habit.target ?? 1));
      className = 'text-zinc-100';
      style = { backgroundColor: `color-mix(in srgb, ${habit.color} ${Math.round(20 + ratio * 45)}%, transparent)` };
      state = `${value} su ${habit.target}`;
    } else if (!scheduled || habit.schedule.kind === 'timesPerWeek') {
      className = 'text-zinc-500';
      state = scheduled ? 'non fatto' : 'non in programma';
    } else if (isToday) {
      className = 'bg-zinc-800 text-zinc-300';
      state = 'da fare';
    } else {
      className = 'bg-zinc-800/70 text-zinc-500';
      state = 'mancato';
    }
  }

  return (
    <button
      disabled={!editable}
      onClick={() => onClick(date)}
      aria-label={`${date}: ${state}`}
      className={`grid aspect-square place-items-center rounded-xl text-sm transition-transform active:scale-90 disabled:cursor-default ${className} ${
        isToday ? 'outline-2 outline-offset-2 outline-white/40' : ''
      }`}
      style={style}
    >
      {dayOfMonth(date)}
    </button>
  );
}
