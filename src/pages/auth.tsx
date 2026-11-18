import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { backend } from '../lib/store';
import { useApp, type Profile } from '../lib/app';
import { LANGS, setLang, useI18n, type Lang } from '../lib/i18n';
import { Logo, errMsg } from '../components/ui';
import { ProfileFields, validateProfile } from '../components/ProfileFields';
import { isoDate } from '../lib/nutrition';

function LangPicker() {
  const { lang } = useI18n();
  return <div className="chips" style={{ justifyContent: 'center' }}>{LANGS.map(l => <button key={l.id} type="button" className={`chip ${lang === l.id ? 'on' : ''}`} onClick={() => setLang(l.id)}>{l.label}</button>)}</div>;
}
function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n(); const { mode } = useApp();
  return <div className="auth"><div className="card stack" style={{ gap: 16 }}>
    <div className="center stack tight"><span className="logo" style={{ justifyContent: 'center' }}><Logo s={36} /> MyFit</span><p className="muted small">{t('app.tagline')}</p></div>
    <LangPicker />
    {mode === 'local' && <div className="banner">{t('auth.localMode')}</div>}
    {children}
  </div></div>;
}

export function Login() {
  const { t } = useI18n(); const nav = useNavigate();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await backend.signIn(email, pw); nav('/'); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return <Shell><form className="stack" onSubmit={submit}>
    <h2>{t('auth.login')}</h2>
    <label className="field">{t('auth.email')}<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label className="field">{t('auth.password')}<input type="password" required autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
    {err && <p className="err" role="alert">{err}</p>}
    <button className="btn primary block" disabled={busy}>{t('auth.login')}</button>
    <div className="row between small"><Link to="/forgot-password">{t('auth.forgot')}</Link><Link to="/register">{t('auth.createAccount')}</Link></div>
  </form></Shell>;
}

export function Register() {
  const { t, lang } = useI18n(); const nav = useNavigate();
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState(''); const [info, setInfo] = useState(''); const [busy, setBusy] = useState(false); const [agree, setAgree] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr(t('auth.pwShort'));
    if (pw !== pw2) return setErr(t('auth.pwMismatch'));
    if (!agree) return setErr(t('auth.mustAgree'));
    setBusy(true);
    try {
      localStorage.setItem('myfit:lang', lang);
      const r = await backend.signUp(email, pw);
      if (r.needsConfirmation) setInfo(t('auth.checkEmail')); else nav('/welcome');
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return <Shell><form className="stack" onSubmit={submit}>
    <h2>{t('auth.createAccount')}</h2>
    <p className="small muted">{t('auth.langHint')}</p>
    <label className="field">{t('auth.email')}<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label className="field">{t('auth.password')}<input type="password" required autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
    <label className="field">{t('auth.password2')}<input type="password" required autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></label>
    <label className="check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> <span className="small">{t('auth.agree')}</span></label>
    {err && <p className="err" role="alert">{err}</p>}{info && <p className="ok" role="status">{info}</p>}
    <button className="btn primary block" disabled={busy}>{t('auth.createAccount')}</button>
    <p className="small center"><Link to="/login">{t('auth.haveAccount')}</Link></p>
  </form></Shell>;
}

export function Forgot() {
  const { t } = useI18n(); const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setMsg('');
    try { await backend.requestPasswordReset(email); setMsg(t('auth.resetSent')); } catch (x) { setErr(errMsg(x)); }
  };
  return <Shell><form className="stack" onSubmit={submit}>
    <h2>{t('auth.forgot')}</h2>
    <label className="field">{t('auth.email')}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    {err && <p className="err" role="alert">{err}</p>}{msg && <p className="ok" role="status">{msg}</p>}
    <button className="btn primary block">{t('auth.sendReset')}</button>
    <p className="small center"><Link to="/login">{t('auth.login')}</Link></p>
  </form></Shell>;
}

export function ResetPassword() {
  const { t } = useI18n(); const nav = useNavigate(); const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr(t('auth.pwShort'));
    try { await backend.updatePassword(pw); nav('/'); } catch (x) { setErr(errMsg(x)); }
  };
  return <Shell><form className="stack" onSubmit={submit}>
    <h2>{t('auth.newPassword')}</h2>
    <label className="field">{t('auth.password')}<input type="password" required autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></label>
    {err && <p className="err" role="alert">{err}</p>}
    <button className="btn primary block">{t('common.save')}</button>
  </form></Shell>;
}

/** Onboarding wizard — collects the full profile after account creation. */
export function Welcome() {
  const { t, lang } = useI18n(); const { saveProfile, user, insert, profile } = useApp(); const nav = useNavigate();
  const [step, setStep] = useState(0); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [p, setP] = useState<Partial<Profile>>(() => ({
    name: '', sex: 'female', activity: 'light', goal: 'healthy', language: lang as Lang, country: 'MA', diet_prefs: [], allergies: [],
    sugar_guidance_pct: 10, walk_goal_min: 30, track_weight: true, budget_period: 'week', ...(profile ?? {}),
  }));
  const sections = ['personal', 'goals', 'food', 'health'] as const;
  const next = async () => {
    const e = validateProfile(p, sections[step], t); if (e) return setErr(e); setErr('');
    if (step < sections.length - 1) return setStep(step + 1);
    setBusy(true);
    try {
      await saveProfile({ ...p, id: user!.id, language: (p.language ?? lang) as Lang, start_weight_kg: p.weight_kg, onboarded: true,
        consent_at: p.consent_sensitive ? new Date().toISOString() : null } as Profile);
      if (p.weight_kg && p.track_weight !== false) await insert('weight_logs', { date: isoDate(), weight_kg: p.weight_kg });
      nav('/');
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return <div className="auth"><div className="card stack" style={{ gap: 16, maxWidth: 520 }}>
    <div className="row between"><span className="logo"><Logo /> MyFit</span><span className="small muted">{step + 1}/{sections.length}</span></div>
    <div className="steps">{sections.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
    <h2>{t('onb.' + sections[step])}</h2>
    {step === 0 && <div className="stack"><p className="small muted">{t('auth.langHint')}</p><LangPicker /></div>}
    <ProfileFields p={p} set={v => setP(x => ({ ...x, ...v }))} section={sections[step]} />
    {err && <p className="err" role="alert">{err}</p>}
    <div className="row">{step > 0 && <button className="btn grow" onClick={() => setStep(step - 1)}>{t('common.back')}</button>}
      <button className="btn primary grow" disabled={busy} onClick={next}>{step === sections.length - 1 ? t('onb.finish') : t('common.next')}</button></div>
  </div></div>;
}
