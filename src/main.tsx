import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import { Layout } from './app/Layout';
import { HunterProvider, useHunter } from './app/store';
import { Spinner } from './app/ui';
import { AuthGate } from './features/auth';
import { Awaken } from './features/awaken';
import { Home } from './features/home';
import { SystemChat } from './features/system';
import { Nutrition } from './features/nutrition';
import { Library } from './features/library';
import { Workout } from './features/workout';
import { Quests, Progress, Profile } from './features/pages';
import { configured } from './lib/supabase';
import { setLang, lang } from './app/i18n';

setLang(lang());
function App() {
  const { session, ready, h, loading, error } = useHunter();
  if (!ready) return <div className="min-h-screen grid place-items-center bg-void-950"><Spinner /></div>;
  if (!configured || !session) return <AuthGate />;
  if (!h && loading) return <div className="min-h-screen grid place-items-center bg-void-950"><Spinner label="SYSTEM · loading hunter data" /></div>;
  if (!h && !error) return <Awaken />;
  return <Layout><Routes>
    <Route path="/" element={<Home />} /><Route path="/system" element={<SystemChat />} /><Route path="/nutrition" element={<Nutrition />} />
    <Route path="/library" element={<Library />} /><Route path="/workout" element={<Workout />} /><Route path="/quests" element={<Quests />} />
    <Route path="/progress" element={<Progress />} /><Route path="/profile" element={<Profile />} />
    <Route path="*" element={<Home />} />
  </Routes></Layout>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><HunterProvider><App /></HunterProvider></BrowserRouter></React.StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
