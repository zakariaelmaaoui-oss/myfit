// THE SYSTEM agent loop (separate from the HTTP handler so it can be tested with a fake database).
import Groq from 'groq-sdk';
import { visionModel } from './server.js';
import { TOOLS, runTool, summary, type Card, type Ctx } from './tools.js';
import { syncDay, getProfile, getStats, DbError } from '../../src/core/engine.js';
import { rankFromLevel } from '../../src/lib/rpg.js';
import { PERSONA } from './persona.js';

const MAX_STEPS = 6;
export class NotAwakened extends Error {}

// Groq's free tier allows ~8k tokens/minute PER MODEL. We track each model's remaining budget from the response
// headers and spread the agent's steps over several capable models instead of waiting.
const POOL = [process.env.GROQ_MODEL, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'].filter((m, i, a): m is string => !!m && a.indexOf(m) === i);
const budget = new Map<string, { remaining: number; resetAt: number }>();
const est = (msgs: unknown, tools?: unknown) => Math.ceil((JSON.stringify(msgs).length + (tools ? JSON.stringify(tools).length : 0)) / 3.6);
const parseReset = (v: string | null) => { if (!v) return 60000; let ms = 0; for (const [, n, u] of v.matchAll(/([\d.]+)(ms|s|m|h)/g)) ms += Number(n) * (u === 'ms' ? 1 : u === 's' ? 1000 : u === 'm' ? 60000 : 3600000); return ms || 60000; };
export async function complete(groq: Groq, params: any, retry = true): Promise<any> {
  const need = est(params.messages, params.tools) + 300;
  const now = Date.now();
  const order = POOL.filter(m => { const b = budget.get(m); return !b || b.resetAt < now || b.remaining > need; });
  const tryList = order.length ? order : [...POOL].sort((a, b) => (budget.get(a)?.resetAt ?? 0) - (budget.get(b)?.resetAt ?? 0));
  let lastErr: unknown;
  for (const model of tryList) {
    try {
      const extra = model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {};
      const { data, response } = await groq.chat.completions.create({ ...params, ...extra, model }, { maxRetries: 0, timeout: 25000 }).withResponse();
      const rem = Number(response.headers.get('x-ratelimit-remaining-tokens'));
      if (isFinite(rem)) budget.set(model, { remaining: rem, resetAt: Date.now() + parseReset(response.headers.get('x-ratelimit-reset-tokens')) });
      if (process.env.AGENT_DEBUG) console.log('model', model, 'remaining', rem, 'est', need - 300, 'real', data.usage?.prompt_tokens);
      (data as any)._model = model;
      return data;
    } catch (e) {
      lastErr = e;
      if (e instanceof Groq.RateLimitError) { budget.set(model, { remaining: 0, resetAt: Date.now() + parseReset((e.headers as any)?.['retry-after'] ? `${(e.headers as any)['retry-after']}s` : null) }); continue; }
      if (e instanceof Groq.NotFoundError || (e instanceof Groq.BadRequestError && /model|tool/i.test(e.message))) continue;
      if (e instanceof Groq.APIConnectionTimeoutError || e instanceof Groq.InternalServerError) continue;
      throw e;
    }
  }
  if (retry && lastErr instanceof Groq.RateLimitError) { // every model is out of budget: wait for the first reset (max 20 s), once
    const wait = Math.min(...POOL.map(m => (budget.get(m)?.resetAt ?? 0) - Date.now()));
    if (wait <= 20000) { await new Promise(r => setTimeout(r, Math.max(500, wait + 300))); return complete(groq, params, false); }
  }
  throw lastErr;
}

/** Small models sometimes loop ("3la l7al. 3la l7al. …"). Detect it so the reply can be regenerated. */
export function degenerate(t: string): boolean {
  const parts = t.split(/[.!?،\n]+/).map(x => x.trim().toLowerCase()).filter(x => x.length > 2);
  if (parts.length < 6) return false;
  const counts = new Map<string, number>(); for (const p of parts) counts.set(p, (counts.get(p) ?? 0) + 1);
  return Math.max(...counts.values()) >= 5 || /(.{6,40}?)\1{4,}/s.test(t);
}

const DARIJA = /\b(ana|nta|nti|wach|chno|chnou|ach|ch7al|kifach|bghit|bghina|klit|kla|kayn|dyal|dial|lyoum|lyouma|daba|bzaf|safi|wakha|mzyan|3afak|lftour|ftour|l3cha|lghda|dert|drt|ndir|n9es|b9a|b9ali|rah|ra|hna|mn|f|w)\b|[a-z][379][a-z]/i;
const FRENCH = /\b(je|j'|tu|il|nous|vous|le|la|les|des|une|est|mon|ma|mes|pour|avec|pas|mal|aujourd|j'ai|faire|quoi|combien|manger)\b/i;
/** The language & script the reply must use (decided from the user's own message, not guessed by the model). */
export function replyLanguage(text: string, fallback: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'Moroccan Darija or Arabic written in ARABIC SCRIPT (same as the user)';
  const words = text.toLowerCase();
  if (DARIJA.test(words) && !FRENCH.test(words)) return 'Moroccan Darija written in LATIN letters with numbers like 3/7/9 (e.g. "Tsjjel. B9at lik 700 kcal.") — NOT English, NOT Arabic script';
  if (FRENCH.test(words)) return 'French';
  if (/^[\x00-\x7F\s\p{P}\p{S}\d]*$/u.test(text) && text.trim().length > 0) return 'English';
  return { dar: 'Moroccan Darija in Latin letters', ar: 'Arabic', fr: 'French', en: 'English' }[fallback] ?? 'English';
}
export async function runAgent(groq: Groq, ctx: Ctx, input: { message: string; image: string | null; time?: string }) {
  const { sb, uid, date } = ctx; const { message, image } = input; const body = { time: input.time };
  const profile = await getProfile(sb, uid);
  if (!profile) throw new NotAwakened();
  const before = await getStats(sb, uid);
  const [{ data: hist }, { data: mem }, today] = await Promise.all([
    sb.from('sf_ai_messages').select('role,content').eq('user_id', uid).order('created_at', { ascending: false }).limit(8),
    sb.from('sf_ai_memory').select('fact').eq('user_id', uid).order('created_at', { ascending: false }).limit(30),
    summary(ctx),
  ]);

  // Food photo → the vision model describes it (clearly an estimate), THE SYSTEM decides what to do with it.
  let photoNote = '';
  if (image) {
    try {
      const v = await groq.chat.completions.create({ model: visionModel(), max_tokens: 600, temperature: 0.2, messages: [{ role: 'user', content: [
        { type: 'text', text: 'Identify the foods on this plate/photo. For each: name, estimated grams, estimated kcal, protein g, carbs g, fat g. Reply ONLY JSON: {"items":[{"name":"","grams":0,"kcal":0,"protein":0,"carbs":0,"fat":0}],"confidence":"low|medium|high"}. If it is not food, {"items":[],"confidence":"low"}.' },
        { type: 'image_url', image_url: { url: image } }] }] as any });
      photoNote = `\n[PHOTO ANALYSIS — AI estimate from the vision model, not exact. Confirm portions with the user if confidence is low; log with log_food (source estimate) when the user wants it logged]: ${(v.choices[0]?.message?.content ?? '').slice(0, 1500)}`;
    } catch (e) { photoNote = '\n[PHOTO ANALYSIS FAILED — tell the user the photo could not be analysed and ask them to describe the meal.]'; console.error('vision', e instanceof Groq.APIError ? e.status : e); }
  }

  const history = (hist ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: String(m.content).slice(0, 500) }));
  while (history.length && history[0].role !== 'user') history.shift();
  const msgs: any[] = [
    { role: 'system', content: `${PERSONA}\n\nHunter profile: ${JSON.stringify({ name: profile.name, age: profile.age, sex: profile.sex, height_cm: profile.height_cm, weight_kg: profile.weight_kg, target_weight_kg: profile.target_weight_kg, goal: profile.goal, experience: profile.experience, location: profile.location, equipment: profile.equipment, diet: profile.diet, allergies: profile.allergies, budget: profile.budget, cuisines: profile.cuisines, limitations: profile.limitations, language: profile.language })}
Memory: ${JSON.stringify((mem ?? []).map(m => m.fact))}
Local date: ${date}. Local time: ${typeof body?.time === 'string' ? body.time.slice(0, 5) : 'unknown'}.
Today right now (already loaded — no need to call get_day_summary unless something changed): ${JSON.stringify(today).slice(0, 4000)}` },
    ...history, { role: 'user', content: (message || 'I sent a photo of my meal.') + photoNote },
    { role: 'system', content: `Reply language for this answer: ${replyLanguage(message, profile.language)}.` },
  ];

  const cards: Card[] = []; let mutated = false; let reply = '';
  for (let step = 0; step < MAX_STEPS; step++) {
    const r = await complete(groq, { messages: msgs, tools: TOOLS, tool_choice: 'auto', temperature: 0.4, max_tokens: 1000 });
    const m = r.choices[0]?.message; if (!m) break;
    if (!m.tool_calls?.length) {
      reply = m.content ?? '';
      if (degenerate(reply)) { // retry the final wording once, then fall back to a plain confirmation
        const f = await complete(groq, { messages: msgs, temperature: 0.3, max_tokens: 500 }).catch(() => null);
        reply = f && !degenerate(f.choices[0]?.message?.content ?? '') ? f.choices[0].message.content : '';
      }
      break;
    }
    msgs.push({ role: 'assistant', content: m.content ?? '', tool_calls: m.tool_calls });
    for (const call of m.tool_calls) {
      let args: any = {}; let content: string;
      try {
        args = JSON.parse(call.function.arguments || '{}');
        const out = await runTool(call.function.name, args, ctx);
        if (out.card) cards.push(out.card); if (out.mutated) mutated = true;
        content = JSON.stringify({ ok: true, ...((out.result && typeof out.result === 'object') ? out.result as object : { value: out.result }) }).slice(0, 8000);
      } catch (e) {
        const msg = e instanceof DbError || e instanceof SyntaxError ? e.message : 'database error';
        if (!(e instanceof DbError)) console.error('tool', call.function.name, e);
        cards.push({ ok: false, title: `NOT SAVED · ${call.function.name.replace(/_/g, ' ').toUpperCase()}`, lines: [msg] });
        content = JSON.stringify({ ok: false, error: msg });
      }
      msgs.push({ role: 'tool', tool_call_id: call.id, content });
    }
    if (step === MAX_STEPS - 1) { const f = await complete(groq, { messages: msgs, temperature: 0.4, max_tokens: 700 }); reply = f.choices[0]?.message?.content ?? ''; }
  }
  if (!reply.trim()) reply = cards.length ? cards.filter(c => c.ok).map(c => `✔ ${c.title}`).join('\n') || '✖' : '…';

  let sync = null;
  if (mutated) {
    sync = await syncDay(sb, uid, date);
    if (sync.awards.length) cards.push({ ok: true, title: 'SYSTEM REWARD', lines: [...sync.completed.map(t => `Quest complete: ${t}`), ...sync.achievements.map(a => `Achievement unlocked: ${a}`), `+${sync.awards.reduce((a, x) => a + x.xp, 0)} XP`] });
  }
  const after = await getStats(sb, uid);
  const ins = await sb.from('sf_ai_messages').insert([
    { user_id: uid, role: 'user', content: (message || '📷 Photo').slice(0, 8000) },
    { user_id: uid, role: 'assistant', content: reply.slice(0, 8000), actions: cards },
  ]);
  if (ins.error) console.error('save chat', ins.error.message);
  return { reply, actions: cards, levelUp: after.level > before.level ? { level: after.level, rank: rankFromLevel(after.level) } : null, stats: after };
}
