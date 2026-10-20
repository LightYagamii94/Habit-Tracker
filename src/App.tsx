import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { HabitDetailPage } from './pages/HabitDetailPage';
import { HabitFormPage } from './pages/HabitFormPage';
import { HabitsPage } from './pages/HabitsPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TodayPage } from './pages/TodayPage';

export function App() {
  return (
    // Hash routing works on static hosting (GitHub Pages) without server rewrites.
    <HashRouter>
      <main className="mx-auto min-h-dvh max-w-md px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/abitudini" element={<HabitsPage />} />
          <Route path="/abitudini/nuova" element={<HabitFormPage key="new" />} />
          <Route path="/abitudini/:id" element={<HabitDetailPage />} />
          <Route path="/abitudini/:id/modifica" element={<HabitFormPage />} />
          <Route path="/statistiche" element={<StatsPage />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </HashRouter>
  );
}
