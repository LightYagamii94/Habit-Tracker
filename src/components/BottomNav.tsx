import { NavLink } from 'react-router-dom';
import { IconChart, IconHome, IconList, IconSettings } from './icons';

const links = [
  { to: '/', label: 'Oggi', Icon: IconHome, end: true },
  { to: '/abitudini', label: 'Abitudini', Icon: IconList, end: false },
  { to: '/statistiche', label: 'Statistiche', Icon: IconChart, end: false },
  { to: '/impostazioni', label: 'Impostazioni', Icon: IconSettings, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-zinc-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {links.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`
            }
          >
            <Icon className="size-6" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
