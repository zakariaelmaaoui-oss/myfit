// Motivation engine: short System messages for the moment of the day. Template-based (no AI cost), never shaming.
export type Slot = 'morning' | 'pre_workout' | 'post_workout' | 'evening' | 'midday';
export type Lang = 'dar' | 'ar' | 'fr' | 'en';
export interface MotivationInput { name: string; questsLeft: number; trainingDay: boolean; workoutDone: boolean; proteinLeft: number | null; kcalLeft: number | null; streak: number; waterLeftMl: number }

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length];
export function slotFor(hour: number): Slot { return hour < 11 ? 'morning' : hour < 16 ? 'midday' : hour < 20 ? 'pre_workout' : 'evening'; }

const M: Record<Lang, Record<Slot, ((i: MotivationInput) => string)[]>> = {
  en: {
    morning: [i => `Good morning, ${i.name}. ${i.questsLeft} quests are waiting. Your past self expects you to quit — prove it wrong.`, i => `A new day, a new gate. ${i.streak > 0 ? `Streak: ${i.streak} days. Keep the flame.` : 'Start the streak today.'}`, () => 'Water first. Then one small victory. The System is watching your progress.'],
    midday: [i => i.proteinLeft && i.proteinLeft > 20 ? `Protein left today: ${i.proteinLeft} g. Make lunch count.` : 'Keep moving. A 10-minute walk after lunch is a quiet power-up.', i => `${i.questsLeft} quests remain. Pick the easiest one and clear it now.`],
    pre_workout: [i => i.trainingDay && !i.workoutDone ? 'The dungeon is open. 30 minutes. Enter, clear it, leave stronger.' : 'Rest day: recovery is training too. A light walk keeps the engine warm.', () => 'Discipline beats motivation. Start the first set — the rest follows.'],
    post_workout: [() => 'Dungeon cleared. Protein and water now — that is where the strength is built.', () => 'Your limits moved today. Recover well; tomorrow they move again.'],
    evening: [i => i.questsLeft > 0 ? `${i.questsLeft} quests left. Finish one more, then evaluate your day with the System.` : 'All quests cleared. Rest — the level-up happens while you sleep.', () => 'Before sleep: tell the System your energy and soreness. It adapts tomorrow’s plan.'],
  },
  fr: {
    morning: [i => `Bonjour ${i.name}. ${i.questsLeft} quêtes t’attendent. Ton ancien toi attend que tu abandonnes — ne lui donne pas ce plaisir.`, i => `Nouveau jour, nouvelle porte. ${i.streak > 0 ? `Série : ${i.streak} jours.` : 'Lance ta série aujourd’hui.'}`],
    midday: [i => i.proteinLeft && i.proteinLeft > 20 ? `Il te reste ${i.proteinLeft} g de protéines. Fais compter ce repas.` : 'Une marche de 10 minutes après le repas : petit bonus, gros effet.', i => `${i.questsLeft} quêtes restantes. Termine la plus simple maintenant.`],
    pre_workout: [i => i.trainingDay && !i.workoutDone ? 'Le donjon est ouvert. Entre, termine-le, ressors plus fort.' : 'Jour de repos : la récupération fait partie de l’entraînement.', () => 'La discipline bat la motivation. Commence la première série.'],
    post_workout: [() => 'Donjon terminé. Protéines et eau maintenant.', () => 'Tes limites ont bougé aujourd’hui. Récupère bien.'],
    evening: [i => i.questsLeft > 0 ? `${i.questsLeft} quêtes restantes. Encore une, puis fais ton bilan avec le Système.` : 'Toutes les quêtes sont terminées. Repose-toi.', () => 'Avant de dormir : donne ton énergie et tes courbatures au Système.'],
  },
  ar: {
    morning: [i => `صباح الخير ${i.name}. ${i.questsLeft} مهام في انتظارك. نسختك القديمة تنتظر أن تستسلم — لا تمنحها ذلك.`, i => i.streak > 0 ? `سلسلتك ${i.streak} يوم. حافظ على الشعلة.` : 'ابدأ سلسلتك اليوم.'],
    midday: [i => i.proteinLeft && i.proteinLeft > 20 ? `بقي لك ${i.proteinLeft} غ من البروتين اليوم.` : 'مشي 10 دقائق بعد الغداء قوة هادئة.', i => `بقيت ${i.questsLeft} مهام. أنجز أسهلها الآن.`],
    pre_workout: [i => i.trainingDay && !i.workoutDone ? 'البوابة مفتوحة. ادخل، أنجز التمرين، واخرج أقوى.' : 'يوم راحة: التعافي جزء من التدريب.', () => 'الانضباط أقوى من الحماس. ابدأ أول مجموعة.'],
    post_workout: [() => 'تم إنجاز التمرين. بروتين وماء الآن.', () => 'حدودك تحركت اليوم.'],
    evening: [i => i.questsLeft > 0 ? `بقيت ${i.questsLeft} مهام. أنجز واحدة أخرى ثم قيّم يومك مع النظام.` : 'أنجزت كل المهام. ارتح.', () => 'قبل النوم: أخبر النظام بطاقتك وألمك العضلي.'],
  },
  dar: {
    morning: [i => `Sba7 lkhir ${i.name}. ${i.questsLeft} dyal l'quests kaytsnaw fik. Nta l9dim kaytsnak t7bes — ma t3tihch had lfor7a.`, i => i.streak > 0 ? `Streak dyalk ${i.streak} iyam. Ma tdfich nnar.` : 'Bda streak dyalk lyoum.', () => 'Kas d lma l2awel. Men b3d rb7a sghira. The System katchouf.'],
    midday: [i => i.proteinLeft && i.proteinLeft > 20 ? `B9at lik ${i.proteinLeft} g d protein lyoum. Khlli lghda ykoun 9wi.` : 'Tmchi 10 d9aye9 men b3d lghda — power-up sghir.', i => `B9aw ${i.questsLeft} quests. Kmmel l'ashel daba.`],
    pre_workout: [i => i.trainingDay && !i.workoutDone ? 'Dungeon m7loul. Dkhol, kmmlo, w khrej a9wa.' : 'Nhar ra7a: recovery 7ta hiya training. Tmchi chwiya.', () => 'Discipline kayghleb motivation. Bda l set lowla, lba9i ghayji.'],
    post_workout: [() => 'Dungeon tsala. Daba protein w lma — tma fin katbna l9owa.', () => 'Limits dyalk t7arkou lyoum. Rta7 mzyan.'],
    evening: [i => i.questsLeft > 0 ? `B9aw ${i.questsLeft} quests. Kmmel wa7d, w goul l System kifach daz nharek.` : 'Kmmlti ga3 l quests. Rta7 — level-up kayji f n3as.', () => '9bel ma tn3es: goul l System energy w l3ya dyalk. Ghaybddel plan dyal ghda.'],
  },
};
export function motivation(slot: Slot, lang: string, i: MotivationInput, seed = new Date().getDate()): string {
  const L = (M as any)[lang] ?? M.en; return pick<(x: MotivationInput) => string>(L[slot], seed)(i);
}
export const PUSH_TITLE: Record<string, string> = { en: 'THE SYSTEM', fr: 'LE SYSTÈME', ar: 'النظام', dar: 'THE SYSTEM' };
