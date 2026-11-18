import { useEffect, useState, type ReactNode } from 'react';
import { AddFoodFlow } from './components/FoodPicker';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './lib/app';
import { useI18n } from './lib/i18n';
import { Icon, Logo, Toasts } from './components/ui';
import { Notifier } from './components/Notifier';
import { Forgot, Login, Register, ResetPassword, Welcome } from './pages/auth';
import { Home } from './pages/home';
import { CustomFoods, Diary, FoodDatabase, FoodHub } from './pages/food';
import { Fridge, RecipeDetail, Recipes } from './pages/recipes';
import { Budget, Planner, Shopping } from './pages/planner';
import { Sugar } from './pages/sugar';
import { Breathing, CheckIn, Drinks, Habits, Journal, Stress, WellnessHub } from './pages/wellness';
import { Period, Sleep, Walk, Water } from './pages/tracking';
import { ActivityHistory, NutritionCharts, ProgressHub, Report, Weight } from './pages/progress';
import { EditProfile, Goals, Language, Notifications, Privacy, ProfileHub, Settings, applyTheme } from './pages/profile';

function Nav() {
  const { t } = useI18n(); const [adding, setAdding] = useState(false);
  const items = [['/', 'home', 'home'], ['/food', 'food', 'food'], null, ['/wellness', 'heart', 'wellness'], ['/progress', 'chart', 'progress'], ['/profile', 'user', 'profile']] as const;
  return <><nav className="nav" aria-label="Main"><span className="brand-side"><Logo s={30} /> MyFit</span><ul>{items.map((it, k) => it === null
    ? <li key="fab" className="fabcell"><button className="fab" aria-label={t('home.addFood')} onClick={() => setAdding(true)} data-testid="fab"><Icon n="plus" s={26} sw={2.4} /><span className="fablabel">{t('home.addFood')}</span></button></li>
    : <li key={k}><NavLink to={it[0]} end={it[0] === '/'} className={({ isActive }) => (isActive ? 'active' : '')}><span className="navicon"><Icon n={it[1]} s={22} /></span>{t('nav.' + it[2])}</NavLink></li>)}</ul></nav>
    <AddFoodFlow open={adding} onClose={() => setAdding(false)} /></>;
}

function Splash({ text }: { text?: string }) {
  return <div className="auth"><div className="center stack" style={{ alignItems: 'center' }}><Logo s={56} /><p className="muted">{text ?? 'MyFit'}</p></div></div>;
}

function Private({ children }: { children: ReactNode }) {
  const { user, ready, loading, profile, error, reload } = useApp(); const loc = useLocation(); const { t } = useI18n();
  if (!ready || (user && loading && !profile)) return <Splash text={t('common.loading')} />;
  if (!user) return <Navigate to="/login" replace />;
  if (error) return <div className="auth"><div className="card stack"><h2>{t('common.error')}</h2><p className="small err">{error}</p><button className="btn primary" onClick={reload}>{t('common.retry')}</button></div></div>;
  if (!profile?.onboarded && loc.pathname !== '/welcome') return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}
function Shell({ children }: { children: ReactNode }) {
  return <Private><div className="app">{children}<Nav /></div><Notifier /></Private>;
}
function PublicOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useApp();
  if (!ready) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Themed() { const { prefs } = useApp(); useEffect(() => applyTheme(prefs.theme), [prefs.theme]); return null; }

export default function App() {
  return <AppProvider><BrowserRouter><Themed /><Toasts /><Routes>
    <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
    <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
    <Route path="/forgot-password" element={<PublicOnly><Forgot /></PublicOnly>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/welcome" element={<Private><Welcome /></Private>} />
    <Route path="/" element={<Shell><Home /></Shell>} />
    <Route path="/food" element={<Shell><FoodHub /></Shell>} />
    <Route path="/food/database" element={<Shell><FoodDatabase /></Shell>} />
    <Route path="/food/diary" element={<Shell><Diary /></Shell>} />
    <Route path="/food/fridge" element={<Shell><Fridge /></Shell>} />
    <Route path="/food/recipes" element={<Shell><Recipes /></Shell>} />
    <Route path="/food/recipes/:id" element={<Shell><RecipeDetail /></Shell>} />
    <Route path="/food/moroccan" element={<Shell><Recipes moroccanOnly /></Shell>} />
    <Route path="/food/planner" element={<Shell><Planner /></Shell>} />
    <Route path="/food/sugar" element={<Shell><Sugar /></Shell>} />
    <Route path="/food/shopping" element={<Shell><Shopping /></Shell>} />
    <Route path="/food/budget" element={<Shell><Budget /></Shell>} />
    <Route path="/food/custom" element={<Shell><CustomFoods /></Shell>} />
    <Route path="/wellness" element={<Shell><WellnessHub /></Shell>} />
    <Route path="/wellness/checkin" element={<Shell><CheckIn /></Shell>} />
    <Route path="/wellness/journal" element={<Shell><Journal /></Shell>} />
    <Route path="/wellness/breathing" element={<Shell><Breathing /></Shell>} />
    <Route path="/wellness/stress" element={<Shell><Stress /></Shell>} />
    <Route path="/wellness/habits" element={<Shell><Habits /></Shell>} />
    <Route path="/wellness/drinks" element={<Shell><Drinks /></Shell>} />
    <Route path="/wellness/water" element={<Shell><Water /></Shell>} />
    <Route path="/wellness/walk" element={<Shell><Walk /></Shell>} />
    <Route path="/wellness/sleep" element={<Shell><Sleep /></Shell>} />
    <Route path="/wellness/period" element={<Shell><Period /></Shell>} />
    <Route path="/progress" element={<Shell><ProgressHub /></Shell>} />
    <Route path="/progress/weight" element={<Shell><Weight /></Shell>} />
    <Route path="/progress/nutrition" element={<Shell><NutritionCharts /></Shell>} />
    <Route path="/progress/activity" element={<Shell><ActivityHistory /></Shell>} />
    <Route path="/progress/report" element={<Shell><Report /></Shell>} />
    <Route path="/profile" element={<Shell><ProfileHub /></Shell>} />
    <Route path="/profile/edit" element={<Shell><EditProfile /></Shell>} />
    <Route path="/profile/goals" element={<Shell><Goals /></Shell>} />
    <Route path="/profile/language" element={<Shell><Language /></Shell>} />
    <Route path="/profile/notifications" element={<Shell><Notifications /></Shell>} />
    <Route path="/profile/privacy" element={<Shell><Privacy /></Shell>} />
    <Route path="/profile/settings" element={<Shell><Settings /></Shell>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AppProvider>;
}
