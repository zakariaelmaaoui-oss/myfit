import { useEffect, useRef } from 'react';
import { useApp } from '../lib/app';
import { useI18n } from '../lib/i18n';
import { inQuietHours, isoDate } from '../lib/nutrition';
import { MSG, REMINDER_TEXT, t4 } from '../data/content';

export async function requestNotificationPermission(): Promise<string> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'default') return await Notification.requestPermission();
  return Notification.permission;
}
export async function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
    else new Notification(title, { body, icon: '/icons/icon-192.png' });
    return true;
  } catch { return false; }
}
const once = (key: string) => { try { if (localStorage.getItem(key)) return false; localStorage.setItem(key, '1'); return true; } catch { return true; } };
const hhmm = (d = new Date()) => d.toTimeString().slice(0, 5);
const minutes = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

/** Runs while the app is open: scheduled reminders + supportive alerts. Content is predefined. */
export function Notifier() {
  const { user, prefs, targets, dayTotals, data, insert, toast } = useApp(); const { t, lang, nf } = useI18n();
  const ref = useRef({ prefs, lang });
  ref.current = { prefs, lang };

  // Scheduled reminders
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      const { prefs: p, lang: l } = ref.current;
      if (!p.notifications_enabled) return;
      const now = new Date(); const cur = hhmm(now); const day = isoDate(now);
      if (inQuietHours(cur, p.quiet_start, p.quiet_end)) return;
      p.reminders.forEach((r, i) => {
        if (!r.enabled) return;
        if (r.type === 'report' && now.getDay() !== p.weekly_report_day) return;
        const diff = minutes(cur) - minutes(r.time);
        if (diff < 0 || diff > 10) return; // fire within 10 minutes after the scheduled time if the app is open
        if (!once(`myfit:fired:${user.id}:${day}:${i}:${r.type}:${r.time}`)) return;
        const body = t4(REMINDER_TEXT[r.type] ?? REMINDER_TEXT.habits, l);
        notify('MyFit', body).then(shown => { if (!shown) toast(body); });
        insert('notifications', { type: r.type, title: 'MyFit', body, read: false }).catch(() => {});
      });
    };
    tick(); const iv = setInterval(tick, 30000); return () => clearInterval(iv);
  }, [user?.id]); // eslint-disable-line

  // Supportive calorie-excess and added-sugar messages (once per day each)
  const today = isoDate(); const tot = dayTotals(today);
  useEffect(() => {
    if (!user || !targets?.kcal) return;
    if (prefs.calorie_excess_alert && tot.totals.kcal > targets.kcal && once(`myfit:over:${user.id}:${today}`)) {
      const msg = `${t('alert.recorded', { k: nf(tot.totals.kcal), d: nf(tot.totals.kcal - targets.kcal), tg: nf(targets.kcal) })} ${t4(MSG.overTarget[0], lang)}`;
      toast(msg, 'warn'); insert('notifications', { type: 'calorie', title: 'MyFit', body: msg, read: false }).catch(() => {});
    }
    if (prefs.sugar_alert && targets.addedSugarMaxG && tot.totals.addedSugar > targets.addedSugarMaxG && once(`myfit:sugar:${user.id}:${today}`)) {
      const msg = `${t('alert.sugar', { g: nf(tot.totals.addedSugar, 1), m: targets.addedSugarMaxG })} ${t4(MSG.addedSugar, lang)}`;
      toast(msg, 'warn'); insert('notifications', { type: 'sugar', title: 'MyFit', body: msg, read: false }).catch(() => {});
    }
  }, [tot.totals.kcal, tot.totals.addedSugar, targets?.kcal, data.diary_entries.length]); // eslint-disable-line
  return null;
}
