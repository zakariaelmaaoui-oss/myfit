import { useState } from 'react';
import { Holo, ShadowEmblem } from '../design';
import { supabase, configured } from '../lib/supabase';
import { Backdrop } from '../app/Layout';
import { LANGS, setLang, lang, t, type Lang } from '../app/i18n';
import { Seg } from '../app/ui';

export function AuthGate() {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in'); const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [, force] = useState(0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    try {
      if (mode === 'in') { const { error } = await supabase.auth.signInWithPassword({ email, password: pw }); if (error) throw error; }
      else if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin } }); if (error) throw error;
        if (!data.session) setMsg('Check your email to confirm your account, then sign in.');
      } else { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/profile' }); if (error) throw error; setMsg('Password reset email sent.'); }
    } catch (x: any) { setErr(x?.message ?? String(x)); } finally { setBusy(false); }
  };
  return <div className="relative min-h-screen font-body text-slate-200 grid place-items-center px-4 py-10">
    <Backdrop />
    <div className="relative z-10 w-full max-w-md">
      <div className="text-center mb-6"><ShadowEmblem s={84} className="mx-auto animate-floaty" />
        <h1 className="display font-black text-3xl tracking-[.25em] mt-3 text-sky-100 glow-text">SHADOW<span className="text-violet-300 glow-violet">FIT</span></h1>
        <p className="label text-neon-cyan mt-2 animate-flicker">[ The Ultimate AI Fitness Hunter System ]</p></div>
      <div className="mb-4 flex justify-center"><Seg value={lang()} options={LANGS} onChange={(l: Lang) => { setLang(l); force(x => x + 1); }} /></div>
      {!configured ? <Holo title="Setup required"><p className="text-sm text-slate-300">The database is not configured: set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Vercel, then redeploy.</p></Holo> :
      <Holo violet scan title={mode === 'in' ? t('signIn') : mode === 'up' ? t('signUp') : t('forgot')}>
        <form onSubmit={submit} className="space-y-3">
          <input className="field" type="email" required autoComplete="email" placeholder={t('email')} value={email} onChange={e => setEmail(e.target.value)} />
          {mode !== 'reset' && <input className="field" type="password" required minLength={8} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} placeholder={t('password') + (mode === 'up' ? ' (8+)' : '')} value={pw} onChange={e => setPw(e.target.value)} />}
          {err && <p className="text-sm text-rose-300">{err}</p>}{msg && <p className="text-sm text-emerald-300">{msg}</p>}
          <button className="neon-btn w-full" disabled={busy}>{busy ? '…' : mode === 'in' ? t('signIn') : mode === 'up' ? t('signUp') : 'Send'}</button>
        </form>
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
          {mode !== 'in' && <button className="text-sky-300 hover:underline" onClick={() => setMode('in')}>{t('signIn')}</button>}
          {mode !== 'up' && <button className="text-violet-300 hover:underline" onClick={() => setMode('up')}>{t('signUp')}</button>}
          {mode === 'in' && <button className="text-slate-400 hover:underline" onClick={() => setMode('reset')}>{t('forgot')}</button>}
        </div>
      </Holo>}
      <p className="text-center text-[11px] text-slate-500 mt-4">Your data is private (protected per account). SHADOW FIT gives general fitness guidance, not medical advice.</p>
    </div>
  </div>;
}
