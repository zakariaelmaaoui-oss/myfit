import { Holo, Icon, ShadowEmblem } from '../design';
import { PREVIEW } from '../app/preview';

const CHIPS = ['How many calories have I eaten?', 'What should I eat tonight?', '10 cheap high-protein meals', 'Record my workout', 'Should I train or rest today?', 'Generate tomorrow’s missions'];

export function SystemChat() {
  return <div className="flex flex-col gap-4 animate-rise min-h-[calc(100vh-180px)]">
    <Holo violet scan className="!py-4">
      <div className="flex items-center gap-3"><div className="relative"><ShadowEmblem s={46} /><span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-void-900 shadow-[0_0_10px_#34d399]" /></div>
        <div><h1 className="display font-black text-xl tracking-[.3em] text-violet-100 glow-violet">THE SYSTEM</h1><div className="text-xs text-slate-400">Connected to nutrition · workouts · quests · progress · memory</div></div></div>
    </Holo>
    <div className="flex-1 space-y-3 pb-4">
      {PREVIEW.chat.map((m, i) => m.role === 'user'
        ? <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-gradient-to-br from-sky-500/30 to-violet-600/30 border border-sky-300/40 text-sky-50 shadow-glow" dir="auto">{m.text}</div></div>
        : m.role === 'action'
          ? <div key={i} className="max-w-[90%] rounded-xl border border-emerald-400/40 bg-emerald-400/[.06] px-4 py-3 shadow-[0_0_18px_rgba(52,211,153,.15)]">
              <div className="flex items-center gap-2 text-emerald-300"><Icon n="check" s={16} sw={3} /><span className="label !text-emerald-300">{m.title}</span></div>
              <ul className="mt-1.5 text-sm text-slate-200 space-y-0.5">{m.lines?.map(l => <li key={l}>› {l}</li>)}</ul>
              <div className="mt-1 text-[11px] text-emerald-300/70">Saved to your database</div></div>
          : <div key={i} className="flex gap-3 max-w-[92%]"><ShadowEmblem s={28} className="shrink-0 mt-1" />
              <div className="holo !py-3 !px-4 !rounded-2xl rounded-tl-md" dir="auto"><span className="label text-neon-cyan block mb-1">System</span>{m.text}</div></div>)}
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">{CHIPS.map(c => <button key={c} className="chip">{c}</button>)}</div>
    <div className="sticky bottom-24 lg:bottom-4 z-10 holo !p-2 flex items-center gap-2 !bg-void-900/95">
      <button className="ghost-btn !px-3" aria-label="Photo"><Icon n="camera" s={18} /></button>
      <input className="field !border-0 !bg-transparent flex-1" placeholder="Talk to THE SYSTEM… (Darija, العربية, Français, English)" />
      <button className="ghost-btn !px-3" aria-label="Voice"><Icon n="mic" s={18} /></button>
      <button className="neon-btn !px-4" aria-label="Send"><Icon n="send" s={18} /></button>
    </div>
  </div>;
}
