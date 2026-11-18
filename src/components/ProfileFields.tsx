import type { Profile } from '../lib/app';
import { useI18n } from '../lib/i18n';

export const DIETS = ['none', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'gluten_free', 'lactose_free', 'low_salt'];
export const ALLERGIES = ['gluten', 'milk', 'eggs', 'peanuts', 'tree_nuts', 'sesame', 'fish', 'shellfish', 'soy'];
export const COUNTRIES = ['MA', 'DZ', 'TN', 'FR', 'BE', 'ES', 'CA', 'US', 'GB', 'other'];

type Section = 'personal' | 'goals' | 'food' | 'health';

export function validateProfile(p: Partial<Profile>, section: Section | 'all', t: (k: string) => string): string | null {
  const need = (s: Section) => section === 'all' || section === s;
  if (need('personal')) {
    if (!p.name || !p.name.trim()) return t('val.name');
    if (!p.age || p.age < 13 || p.age > 120) return t('val.age');
    if (!p.height_cm || p.height_cm < 100 || p.height_cm > 250) return t('val.height');
    if (!p.weight_kg || p.weight_kg < 25 || p.weight_kg > 350) return t('val.weight');
    if (p.target_weight_kg && (p.target_weight_kg < 25 || p.target_weight_kg > 350)) return t('val.target');
  }
  if (need('health') && (p.pregnant || p.breastfeeding || p.medical_supervision || p.eating_disorder_history || p.health_notes) && !p.consent_sensitive) return t('val.consent');
  return null;
}

export function ProfileFields({ p, set, section }: { p: Partial<Profile>; set: (v: Partial<Profile>) => void; section: Section }) {
  const { t } = useI18n();
  const num = (v: string) => (v === '' ? null : Number(v)) as any;
  const toggle = (arr: string[] | undefined, v: string) => { const a = arr ?? []; return a.includes(v) ? a.filter(x => x !== v) : [...a, v]; };
  if (section === 'personal') return <div className="stack">
    <label className="field">{t('p.name')}<input value={p.name ?? ''} onChange={e => set({ name: e.target.value })} autoComplete="given-name" /></label>
    <div className="grid2">
      <label className="field">{t('p.age')}<input type="number" inputMode="numeric" min={13} max={120} value={p.age ?? ''} onChange={e => set({ age: num(e.target.value) })} /></label>
      <label className="field">{t('p.sex')}<select value={p.sex} onChange={e => set({ sex: e.target.value as any })}>
        <option value="female">{t('p.female')}</option><option value="male">{t('p.male')}</option><option value="other">{t('p.otherSex')}</option></select></label>
      <label className="field">{t('p.height')}<input type="number" inputMode="decimal" value={p.height_cm ?? ''} onChange={e => set({ height_cm: num(e.target.value) })} /></label>
      <label className="field">{t('p.weight')}<input type="number" inputMode="decimal" step="0.1" value={p.weight_kg ?? ''} onChange={e => set({ weight_kg: num(e.target.value) })} /></label>
    </div>
    <label className="field">{t('p.target')}<input type="number" inputMode="decimal" step="0.1" value={p.target_weight_kg ?? ''} onChange={e => set({ target_weight_kg: num(e.target.value) })} /></label>
    <p className="tiny muted">{t('p.sexHint')}</p>
  </div>;
  if (section === 'goals') return <div className="stack">
    <label className="field">{t('p.activity')}<select value={p.activity} onChange={e => set({ activity: e.target.value })}>
      {['sedentary', 'light', 'moderate', 'active', 'very_active'].map(a => <option key={a} value={a}>{t('act.' + a)}</option>)}</select></label>
    <div className="field">{t('p.goal')}<div className="chips">{['lose', 'maintain', 'healthy', 'muscle'].map(g => <button type="button" key={g} className={`chip ${p.goal === g ? 'on' : ''}`} onClick={() => set({ goal: g })}>{t('goal.' + g)}</button>)}</div></div>
    <label className="field">{t('p.walkGoal')}<input type="number" min={5} max={300} value={p.walk_goal_min ?? 30} onChange={e => set({ walk_goal_min: num(e.target.value) })} /></label>
    <label className="check"><input type="checkbox" checked={p.track_weight !== false} onChange={e => set({ track_weight: e.target.checked })} />{t('p.trackWeight')}</label>
  </div>;
  if (section === 'food') return <div className="stack">
    <div className="field">{t('p.diet')}<div className="chips">{DIETS.map(d => <button type="button" key={d} className={`chip ${(p.diet_prefs ?? []).includes(d) ? 'on' : ''}`} onClick={() => set({ diet_prefs: toggle(p.diet_prefs, d) })}>{t('diet.' + d)}</button>)}</div></div>
    <div className="field">{t('p.allergies')}<div className="chips">{ALLERGIES.map(d => <button type="button" key={d} className={`chip ${(p.allergies ?? []).includes(d) ? 'on' : ''}`} onClick={() => set({ allergies: toggle(p.allergies, d) })}>{t('allergy.' + d)}</button>)}</div></div>
    <label className="field">{t('p.restrictions')}<input value={p.restrictions ?? ''} onChange={e => set({ restrictions: e.target.value })} placeholder={t('p.restrictionsPh')} /></label>
    <div className="grid2">
      <label className="field">{t('p.country')}<select value={p.country ?? 'MA'} onChange={e => set({ country: e.target.value })}>{COUNTRIES.map(c => <option key={c} value={c}>{t('country.' + c)}</option>)}</select></label>
      <label className="field">{t('p.budget')}<input type="number" min={0} value={p.budget_mad ?? ''} onChange={e => set({ budget_mad: num(e.target.value) })} placeholder="MAD" /></label>
    </div>
    <label className="field">{t('p.budgetPeriod')}<select value={p.budget_period ?? 'week'} onChange={e => set({ budget_period: e.target.value as any })}><option value="week">{t('common.perWeek')}</option><option value="month">{t('common.perMonth')}</option></select></label>
  </div>;
  return <div className="stack">
    <p className="small muted">{t('p.healthIntro')}</p>
    <label className="check"><input type="checkbox" checked={!!p.pregnant} onChange={e => set({ pregnant: e.target.checked })} />{t('p.pregnant')}</label>
    <label className="check"><input type="checkbox" checked={!!p.breastfeeding} onChange={e => set({ breastfeeding: e.target.checked })} />{t('p.breastfeeding')}</label>
    <label className="check"><input type="checkbox" checked={!!p.medical_supervision} onChange={e => set({ medical_supervision: e.target.checked })} />{t('p.medical')}</label>
    <label className="check"><input type="checkbox" checked={!!p.eating_disorder_history} onChange={e => set({ eating_disorder_history: e.target.checked })} />{t('p.ed')}</label>
    <label className="field">{t('p.healthNotes')}<textarea value={p.health_notes ?? ''} onChange={e => set({ health_notes: e.target.value })} /></label>
    <label className="check"><input type="checkbox" checked={!!p.consent_sensitive} onChange={e => set({ consent_sensitive: e.target.checked })} /><span className="small">{t('p.consent')}</span></label>
  </div>;
}
