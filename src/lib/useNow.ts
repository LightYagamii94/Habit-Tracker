import { useEffect, useState } from 'react';

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Minutes since local midnight, refreshed every 30 seconds and when the app comes back to the foreground. */
export function useNowMinutes() {
  const [now, setNow] = useState(minutesNow);
  useEffect(() => {
    const tick = () => setNow(minutesNow());
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}
