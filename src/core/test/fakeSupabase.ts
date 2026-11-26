// Minimal in-memory stand-in for the parts of supabase-js the engine uses (tests only).
const UNIQUE: Record<string, string[]> = {
  sf_profiles: ['id'], sf_targets: ['user_id', 'effective_from'], sf_xp_events: ['user_id', 'kind', 'ref'], sf_quests: ['user_id', 'date', 'key'],
  sf_challenges: ['user_id', 'week_start', 'key'], sf_achievements: ['user_id', 'key'], sf_exercise_progress: ['user_id', 'exercise_id'],
  sf_personal_records: ['user_id', 'exercise_id', 'metric'], sf_checkins: ['user_id', 'date'], sf_weights: ['user_id', 'date'],
};
const DEFAULTS: Record<string, () => any> = {
  sf_quests: () => ({ status: 'active', progress: 0, completed_at: null }), sf_challenges: () => ({ status: 'active', progress: 0 }),
  sf_workout_sessions: () => ({ status: 'in_progress', started_at: new Date(Date.now() - 30 * 60000).toISOString() }), sf_training_plans: () => ({ active: true }),
  sf_exercise_progress: () => ({ good_streak: 0, bad_streak: 0, last_change: null, last_change_at: null }),
};
let n = 0;
export function fakeSupabase() {
  const db: Record<string, any[]> = {};
  const T = (t: string) => (db[t] ??= []);
  class Q {
    op = 'select'; filters: ((r: any) => boolean)[] = []; payload: any; opts: any = {}; ord: [string, boolean][] = []; lim = Infinity; one: '' | 'single' | 'maybe' = ''; head = false; ret = false;
    constructor(public t: string) {}
    select(_c?: string, o?: any) { if (this.op !== 'select') this.ret = true; if (o?.head) this.head = true; return this; }
    insert(p: any) { this.op = 'insert'; this.payload = p; return this; }
    upsert(p: any, o: any = {}) { this.op = 'upsert'; this.payload = p; this.opts = o; return this; }
    update(p: any) { this.op = 'update'; this.payload = p; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(k: string, v: any) { this.filters.push(r => r[k] === v); return this; }
    in(k: string, v: any[]) { this.filters.push(r => v.includes(r[k])); return this; }
    ilike(k: string, v: string) { const re = new RegExp('^' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); this.filters.push(r => re.test(String(r[k] ?? ''))); return this; }
    is(k: string, v: any) { this.filters.push(r => (r[k] ?? null) === v); return this; }
    gte(k: string, v: any) { this.filters.push(r => r[k] >= v); return this; }
    lte(k: string, v: any) { this.filters.push(r => r[k] <= v); return this; }
    order(k: string, o: any = {}) { this.ord.push([k, o.ascending !== false]); return this; }
    limit(x: number) { this.lim = x; return this; }
    single() { this.one = 'single'; return this; }
    maybeSingle() { this.one = 'maybe'; return this; }
    run(): { data: any; error: any; count?: number } {
      if (this.t === 'sf_hunter_stats') {
        const ev = T('sf_xp_events'); const users = [...new Set(ev.map(e => e.user_id))];
        db.sf_hunter_stats = users.map(u => { const m = ev.filter(e => e.user_id === u); const s = (a?: string) => m.filter(e => !a || e.attribute === a).reduce((x, e) => x + e.xp, 0);
          return { user_id: u, xp: s(), strength_xp: s('strength'), endurance_xp: s('endurance'), discipline_xp: s('discipline'), consistency_xp: s('consistency'), fitness_xp: s('fitness') }; });
      }
      const rows = T(this.t); let out: any[] = [];
      const match = (r: any) => this.filters.every(f => f(r));
      if (this.op === 'insert' || this.op === 'upsert') {
        for (const p of [].concat(this.payload)) {
          const keys = (this.opts.onConflict?.split(',') ?? UNIQUE[this.t]) as string[] | undefined;
          const ex = keys ? rows.find(r => keys.every(k => r[k] === (p as any)[k])) : undefined;
          if (ex && this.op === 'insert') return { data: null, error: { message: 'duplicate key' } };
          if (ex) { if (this.opts.ignoreDuplicates) continue; Object.assign(ex, p); out.push(ex); }
          else { const r = { id: `id${++n}`, created_at: new Date(Date.now() + n).toISOString(), ...(DEFAULTS[this.t]?.() ?? {}), ...(p as any) }; rows.push(r); out.push(r); }
        }
      } else if (this.op === 'update') { out = rows.filter(match); for (const r of out) Object.assign(r, this.payload); }
      else if (this.op === 'delete') { out = rows.filter(match); db[this.t] = rows.filter(r => !match(r)); }
      else {
        out = rows.filter(match);
        for (const [k, asc] of [...this.ord].reverse()) out.sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (asc ? 1 : -1));
        out = out.slice(0, this.lim);
        if (this.head) return { data: null, error: null, count: out.length };
      }
      out = out.map(r => ({ ...r }));
      if (this.op !== 'select' && !this.ret) return { data: null, error: null };
      if (this.one === 'single') return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: `expected 1 row, got ${out.length}` } };
      if (this.one === 'maybe') return { data: out[0] ?? null, error: null };
      return { data: out, error: null };
    }
    then(res: (v: any) => any, rej?: (e: any) => any) { try { return Promise.resolve(this.run()).then(res, rej); } catch (e) { return Promise.reject(e).then(res, rej); } }
  }
  return { db, client: { from: (t: string) => new Q(t) } as any };
}
