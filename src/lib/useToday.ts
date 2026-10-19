import { useEffect, useState } from 'react';
import { todayKey } from './dates';

/** Today's date key; updates after midnight and when the app comes back to the foreground. */
export function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const tick = () => setToday(todayKey());
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}
