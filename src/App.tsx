import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { HabitFormPage } from './pages/HabitFormPage';
import { HabitsPage } from './pages/HabitsPage';
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
          <Route path="/abitudini/:id" element={<HabitFormPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </HashRouter>
  );
}
