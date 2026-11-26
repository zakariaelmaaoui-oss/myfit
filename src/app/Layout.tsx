import { useEffect, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Icon, LevelUpOverlay, ParticleField, RankBadge, ShadowEmblem } from '../design';
import { useHunter } from './store';
import { Toasts } from './ui';
import { t } from './i18n';

const NAV = [
  { to: '/', icon: 'home', k: 'home' }, { to: '/system', icon: 'system', k: 'system' }, { to: '/nutrition', icon: 'food', k: 'nutrition' },
  { to: '/library', icon: 'book', k: 'library' }, { to: '/workout', icon: 'sword', k: 'workout' }, { to: '/quests', icon: 'quest', k: 'quests' },
  { to: '/progress', icon: 'chart', k: 'progress' }, { to: '/profile', icon: 'user', k: 'profile' },
];
const MOBILE = ['/', '/nutrition', '/system', '/workout', '/quests'];

export function Backdrop() { return <><div className="backdrop" /><ParticleField /></>; }
export function Layout({ children }: { children: ReactNode }) {
  const { h: H, levelUp, clearLevelUp } = useHunter(); const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const h = { name: H?.profile.name ?? '', rank: H?.stats.rank ?? 'E', level: H?.stats.level ?? 1 };
  return <div className="relative min-h-screen font-body text-slate-200">
    <div className="backdrop" /><ParticleField />
    {/* Desktop sidebar */}
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 z-20 flex-col border-r border-sky-400/15 bg-void-900/70 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-3 px-6 pt-7 pb-6"><ShadowEmblem s={38} /><div><div className="display font-black tracking-[.2em] text-sky-100 glow-text text-sm">SHADOW</div><div className="display font-black tracking-[.42em] text-violet-300 glow-violet text-sm">FIT</div></div></Link>
      <nav className="flex-1 px-3 space-y-1">{NAV.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) =>
        `group flex items-center gap-3 px-4 h-11 rounded-xl font-ui font-bold tracking-[.12em] uppercase text-[13px] transition ${isActive ? 'text-sky-100 bg-gradient-to-r from-sky-500/20 to-violet-500/10 shadow-glow' : 'text-slate-400 hover:text-sky-200 hover:bg-sky-400/5'}`}>
        <Icon n={n.icon} s={18} /> {t(n.k)}</NavLink>)}</nav>
      <div className="m-3 holo !p-3 flex items-center gap-3"><div className="corners"><i /><i /><i /><i /></div><RankBadge rank={h.rank} s={44} /><div className="min-w-0"><div className="label">Hunter</div><div className="font-ui font-bold text-sky-100 truncate">{h.name}</div><div className="text-xs text-violet-300 display">LV {h.level}</div></div></div>
    </aside>
    {/* Mobile top bar */}
    <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-void-950/70 backdrop-blur-xl border-b border-sky-400/10">
      <Link to="/" className="flex items-center gap-2"><ShadowEmblem s={28} /><span className="display font-black tracking-[.2em] text-sm text-sky-100 glow-text">SHADOW<span className="text-violet-300 glow-violet">FIT</span></span></Link>
      <div className="flex items-center gap-2"><Link to="/library" className="ghost-btn !min-h-9 !px-2.5" aria-label={t('library')}><Icon n="book" s={17} /></Link><Link to="/progress" className="ghost-btn !min-h-9 !px-2.5" aria-label={t('progress')}><Icon n="chart" s={17} /></Link><Link to="/profile" className="ghost-btn !min-h-9 !px-2.5" aria-label={t('profile')}><Icon n="user" s={17} /></Link></div>
    </header>
    <main className="relative z-10 lg:pl-64 pb-28 lg:pb-10"><div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 lg:pt-8">
      {children}
    </div></main>
    {/* Mobile bottom nav with central SYSTEM orb */}
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="relative mx-auto max-w-md grid grid-cols-5 items-end h-16 rounded-2xl border border-sky-400/25 bg-void-900/85 backdrop-blur-xl shadow-glow">
        {MOBILE.map(to => { const n = NAV.find(x => x.to === to)!; const center = to === '/system';
          return <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 h-full font-ui font-bold text-[10px] tracking-widest uppercase ${isActive ? 'text-sky-200' : 'text-slate-500'}`}>
            {center ? <span className="-mt-8 grid place-items-center w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-glow-violet ring-4 ring-void-950 animate-floaty"><Icon n="system" s={28} /></span>
              : <Icon n={n.icon} s={21} />}
            <span className={center ? 'mt-0.5' : ''}>{center ? 'System' : t(n.k)}</span></NavLink>; })}
      </div>
    </nav>
    <Toasts />
    {levelUp && <LevelUpOverlay level={levelUp.level} rank={levelUp.rank} onClose={clearLevelUp} />}
  </div>;
}
