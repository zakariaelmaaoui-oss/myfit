import { useEffect, useRef, useState } from 'react';
import { Holo, Icon, ShadowEmblem } from '../design';
import { supabase } from '../lib/supabase';
import { api, ApiError, localTime, today } from '../app/api';
import { useHunter } from '../app/store';
import { t, lang } from '../app/i18n';

interface Card { ok: boolean; title: string; lines: string[] }
interface Msg { id: string; role: 'user' | 'assistant'; content: string; actions?: Card[]; photo?: string; pending?: boolean }
const CHIPS: Record<string, string[]> = {
  dar: ['Ch7al klit lyoum?', 'Chno nakol f l3cha?', '10 wajabat rkhisin b protein', 'Sjjel tamrin dyali', 'Ntrena wla nrta7 lyoum?', 'Wjjed lia quests dyal ghda'],
  en: ['How many calories have I eaten?', 'What should I eat tonight?', '10 cheap high-protein meals', 'Record my workout', 'Should I train or rest today?', 'Plan my meals for the rest of today'],
  fr: ['Combien de calories aujourd’hui ?', 'Que manger ce soir ?', '10 repas riches en protéines pas chers', 'Note ma séance', 'Je m’entraîne ou je me repose ?', 'Planifie mes repas'],
  ar: ['كم سعرة أكلت اليوم؟', 'ماذا آكل في العشاء؟', '10 وجبات رخيصة غنية بالبروتين', 'سجل تمريني', 'هل أتمرن أم أرتاح اليوم؟', 'خطط وجباتي'],
};
const ERR: Record<string, string> = {
  ai_not_configured: 'THE SYSTEM is offline: the server has no GROQ_API_KEY. Add it in Vercel → Settings → Environment Variables.',
  ai_key_invalid: 'The Groq API key on the server is invalid or was deleted. Put the new key in Vercel (GROQ_API_KEY) and redeploy.',
  ai_busy: 'THE SYSTEM is busy (free AI limit per minute). Wait ~30 seconds and try again.', daily_limit: 'Daily message limit reached. Back tomorrow, Hunter.',
  database_not_configured: 'Server database settings missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).', not_awakened: 'Finish the awakening first.',
};

async function resize(file: File): Promise<string> {
  const img = await createImageBitmap(file); const s = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.82);
}

export function SystemChat() {
  const { uid, refresh, showLevelUp } = useHunter();
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [photo, setPhoto] = useState<string | null>(null);
  const [listening, setListening] = useState(false); const end = useRef<HTMLDivElement>(null); const fileRef = useRef<HTMLInputElement>(null);
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  useEffect(() => { if (!uid) return; supabase.from('sf_ai_messages').select('id,role,content,actions').eq('user_id', uid).order('created_at', { ascending: false }).limit(40)
    .then(({ data }) => setMsgs((data ?? []).reverse() as Msg[])); }, [uid]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs]);

  const send = async (m = text) => {
    const message = m.trim(); if ((!message && !photo) || busy) return;
    const img = photo; setText(''); setPhoto(null); setBusy(true);
    setMsgs(x => [...x, { id: 'u' + Date.now(), role: 'user', content: message || '📷', photo: img ?? undefined }, { id: 'p', role: 'assistant', content: '', pending: true }]);
    try {
      const r = await api<{ reply: string; actions: Card[]; levelUp: any }>('/api/system', { message, date: today(), time: localTime(), image: img });
      setMsgs(x => [...x.filter(y => !y.pending), { id: 'a' + Date.now(), role: 'assistant', content: r.reply, actions: r.actions }]);
      if (r.actions.some(a => a.ok)) await refresh();
      if (r.levelUp) showLevelUp(r.levelUp);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'network';
      setMsgs(x => [...x.filter(y => !y.pending), { id: 'e' + Date.now(), role: 'assistant', content: `⚠ ${ERR[code] ?? 'THE SYSTEM could not answer (' + code + '). Nothing was saved.'}` }]);
    } finally { setBusy(false); }
  };
  const voice = () => {
    if (!SR) return; const r = new SR(); r.lang = { dar: 'ar-MA', ar: 'ar-SA', fr: 'fr-FR', en: 'en-US' }[lang()] ?? 'en-US'; r.interimResults = false;
    r.onresult = (e: any) => setText(x => (x ? x + ' ' : '') + e.results[0][0].transcript); r.onend = () => setListening(false); setListening(true); r.start();
  };

  return <div className="flex flex-col gap-4 animate-rise">
    <Holo violet scan className="!py-4">
      <div className="flex items-center gap-3"><div className="relative"><ShadowEmblem s={46} /><span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-void-900 shadow-[0_0_10px_#34d399]" /></div>
        <div><h1 className="display font-black text-xl tracking-[.3em] text-violet-100 glow-violet">THE SYSTEM</h1><div className="text-xs text-slate-400">Connected to nutrition · workouts · quests · progress · memory</div></div></div>
    </Holo>
    <div className="space-y-3 pb-44 lg:pb-36">
      {!msgs.length && <div className="flex gap-3 max-w-[92%]"><ShadowEmblem s={28} className="shrink-0 mt-1" /><div className="holo !py-3 !px-4 !rounded-2xl rounded-tl-md"><span className="label text-neon-cyan block mb-1">System</span>
        Hunter. I am connected to your food diary, training plan, quests and progress. Tell me what you ate, what you trained, or ask what to do next — in Darija, العربية, Français or English.</div></div>}
      {msgs.map(m => m.role === 'user'
        ? <div key={m.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-gradient-to-br from-sky-500/30 to-violet-600/30 border border-sky-300/40 text-sky-50 shadow-glow whitespace-pre-wrap" dir="auto">
            {m.photo && <img src={m.photo} alt="" className="rounded-lg mb-2 max-h-48" />}{m.content}</div></div>
        : <div key={m.id} className="space-y-2">
            {m.actions?.map((a, i) => <div key={i} className={`max-w-[90%] rounded-xl border px-4 py-3 ${a.ok ? 'border-emerald-400/40 bg-emerald-400/[.06] shadow-[0_0_18px_rgba(52,211,153,.15)]' : 'border-rose-400/40 bg-rose-400/[.06]'}`}>
              <div className={`flex items-center gap-2 ${a.ok ? 'text-emerald-300' : 'text-rose-300'}`}><Icon n={a.ok ? 'check' : 'shield'} s={16} sw={3} /><span className={`label ${a.ok ? '!text-emerald-300' : '!text-rose-300'}`}>{a.title}</span></div>
              <ul className="mt-1.5 text-sm text-slate-200 space-y-0.5">{a.lines.map((l, j) => <li key={j}>› {l}</li>)}</ul>
              <div className={`mt-1 text-[11px] ${a.ok ? 'text-emerald-300/70' : 'text-rose-300/80'}`}>{a.ok ? 'Saved to your database' : 'Not saved'}</div></div>)}
            {(m.content || m.pending) && <div className="flex gap-3 max-w-[92%]"><ShadowEmblem s={28} className="shrink-0 mt-1" />
              <div className="holo !py-3 !px-4 !rounded-2xl rounded-tl-md whitespace-pre-wrap" dir="auto"><span className="label text-neon-cyan block mb-1">System</span>
                {m.pending ? <span className="inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}</span> : m.content}</div></div>}
          </div>)}
      <div ref={end} />
    </div>
    <div className="fixed inset-x-0 bottom-[88px] lg:bottom-4 lg:left-64 z-20 px-4">
      <div className="mx-auto max-w-6xl lg:px-2">
        <div className="flex gap-2 overflow-x-auto pb-2">{(CHIPS[lang()] ?? CHIPS.en).map(c => <button key={c} className="chip shrink-0 !bg-void-900/90" onClick={() => send(c)} disabled={busy}>{c}</button>)}</div>
        {photo && <div className="mb-2 flex items-center gap-2"><img src={photo} alt="" className="h-14 rounded-lg border border-sky-400/40" /><span className="text-xs text-slate-400">Photo → AI estimate (approximate)</span><button className="text-rose-300 text-xs" onClick={() => setPhoto(null)}>✕</button></div>}
        <form className="holo !p-2 flex items-center gap-2 !bg-void-900/95" onSubmit={e => { e.preventDefault(); send(); }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) setPhoto(await resize(f)); e.target.value = ''; }} />
          <button type="button" className="ghost-btn !px-3" aria-label={t('photo')} onClick={() => fileRef.current?.click()}><Icon n="camera" s={18} /></button>
          <input className="field !border-0 !bg-transparent flex-1" placeholder={t('talk')} value={text} onChange={e => setText(e.target.value)} dir="auto" maxLength={2000} />
          {SR && <button type="button" className={`ghost-btn !px-3 ${listening ? '!text-rose-300 animate-pulse' : ''}`} aria-label={t('voice')} onClick={voice}><Icon n="mic" s={18} /></button>}
          <button className="neon-btn !px-4" aria-label={t('send')} disabled={busy || (!text.trim() && !photo)}><Icon n="send" s={18} /></button>
        </form>
      </div>
    </div>
  </div>;
}
