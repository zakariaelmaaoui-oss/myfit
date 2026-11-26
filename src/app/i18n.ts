// UI strings in 4 languages. Missing keys fall back to English. Darija is written in Latin letters (as Moroccans text).
export type Lang = 'dar' | 'ar' | 'fr' | 'en';
type D = Record<string, string>;
const en: D = {
  home: 'Home', system: 'The System', nutrition: 'Nutrition', library: 'Food Library', workout: 'Workout', quests: 'Quests', progress: 'Progress', profile: 'Profile',
  level: 'Level', streak: 'Streak', rank: 'Rank', xp: 'XP', status: 'Status', energy: 'Energy · Today', remaining: 'Remaining', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fiber: 'Fiber',
  water: 'Water', weight: 'Weight', dailyQuest: 'Daily Quest', openQuests: 'Open quest log', todaysDungeon: 'Today’s dungeon', restDay: 'Rest day', enter: 'Enter', vitals: 'Vitals',
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', add: 'Add', save: 'Save', cancel: 'Cancel', delete: 'Delete', close: 'Close', search: 'Search', loading: 'Loading…',
  estimate: 'AI estimate', addFood: 'Add food', searchFood: 'Search foods', customFood: 'Custom food', grams: 'grams', servings: 'servings', perServing: 'per serving',
  signIn: 'Enter the gate', signUp: 'Awaken (create account)', email: 'Email', password: 'Password', forgot: 'Forgot password?', signOut: 'Sign out',
  talk: 'Talk to THE SYSTEM… (Darija, العربية, Français, English)', send: 'Send', photo: 'Photo', voice: 'Voice',
  start: 'Start session', finish: 'Finish workout', logSet: 'Log set', sets: 'sets', reps: 'reps', seconds: 'sec', rest: 'rest', rpe: 'How hard was it? (RPE)', activity: 'Log activity',
  weekly: 'Weekly challenges', achievements: 'Achievements', newQuest: 'New custom quest', done: 'Done', checkin: 'Evening evaluation', energyLvl: 'Energy', soreness: 'Soreness', mood: 'Mood', sleep: 'Sleep (h)',
  logWeight: 'Log weight', report: 'Weekly evaluation', generate: 'Generate', apply: 'Apply suggestion', photos: 'Progress photos (private)', measurements: 'Measurements',
  language: 'Language', notifications: 'Notifications', edit: 'Edit', favorites: 'Favorites', planDay: 'Plan my day', ideas: 'Meal ideas',
};
const fr: D = {
  home: 'Accueil', system: 'Le Système', nutrition: 'Nutrition', library: 'Bibliothèque', workout: 'Entraînement', quests: 'Quêtes', progress: 'Progrès', profile: 'Profil',
  level: 'Niveau', streak: 'Série', rank: 'Rang', status: 'Statut', energy: 'Énergie · Aujourd’hui', remaining: 'Reste', protein: 'Protéines', carbs: 'Glucides', fat: 'Lipides', fiber: 'Fibres',
  water: 'Eau', weight: 'Poids', dailyQuest: 'Quête du jour', openQuests: 'Journal des quêtes', todaysDungeon: 'Donjon du jour', restDay: 'Jour de repos', enter: 'Entrer', vitals: 'Signes vitaux',
  breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation', add: 'Ajouter', save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', close: 'Fermer', search: 'Rechercher', loading: 'Chargement…',
  estimate: 'Estimation IA', addFood: 'Ajouter un aliment', searchFood: 'Chercher un aliment', customFood: 'Aliment perso', grams: 'grammes', servings: 'portions', perServing: 'par portion',
  signIn: 'Franchir la porte', signUp: 'S’éveiller (créer un compte)', email: 'E-mail', password: 'Mot de passe', forgot: 'Mot de passe oublié ?', signOut: 'Déconnexion',
  talk: 'Parle au SYSTÈME…', send: 'Envoyer', photo: 'Photo', voice: 'Voix',
  start: 'Commencer', finish: 'Terminer la séance', logSet: 'Noter la série', sets: 'séries', reps: 'reps', seconds: 's', rest: 'repos', rpe: 'Difficulté ressentie (RPE)', activity: 'Noter une activité',
  weekly: 'Défis de la semaine', achievements: 'Succès', newQuest: 'Nouvelle quête', done: 'Fait', checkin: 'Bilan du soir', energyLvl: 'Énergie', soreness: 'Courbatures', mood: 'Humeur', sleep: 'Sommeil (h)',
  logWeight: 'Noter le poids', report: 'Bilan de la semaine', generate: 'Générer', apply: 'Appliquer', photos: 'Photos (privées)', measurements: 'Mensurations',
  language: 'Langue', notifications: 'Notifications', edit: 'Modifier', favorites: 'Favoris', planDay: 'Planifier ma journée', ideas: 'Idées repas',
};
const ar: D = {
  home: 'الرئيسية', system: 'النظام', nutrition: 'التغذية', library: 'مكتبة الأكل', workout: 'التمارين', quests: 'المهام', progress: 'التقدم', profile: 'الملف',
  level: 'المستوى', streak: 'السلسلة', rank: 'الرتبة', status: 'الحالة', energy: 'الطاقة · اليوم', remaining: 'المتبقي', protein: 'بروتين', carbs: 'كربوهيدرات', fat: 'دهون', fiber: 'ألياف',
  water: 'الماء', weight: 'الوزن', dailyQuest: 'مهمة اليوم', openQuests: 'سجل المهام', todaysDungeon: 'تمرين اليوم', restDay: 'يوم راحة', enter: 'ادخل', vitals: 'المؤشرات',
  breakfast: 'الفطور', lunch: 'الغداء', dinner: 'العشاء', snack: 'وجبة خفيفة', add: 'أضف', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', close: 'إغلاق', search: 'بحث', loading: 'جار التحميل…',
  estimate: 'تقدير الذكاء الاصطناعي', addFood: 'أضف أكلة', searchFood: 'ابحث عن أكلة', customFood: 'أكلة خاصة', grams: 'غرام', servings: 'حصص', perServing: 'للحصة',
  signIn: 'ادخل البوابة', signUp: 'استيقظ (حساب جديد)', email: 'البريد', password: 'كلمة السر', forgot: 'نسيت كلمة السر؟', signOut: 'خروج',
  talk: 'تكلم مع النظام…', send: 'إرسال', photo: 'صورة', voice: 'صوت',
  start: 'ابدأ الحصة', finish: 'أنهِ التمرين', logSet: 'سجل المجموعة', sets: 'مجموعات', reps: 'تكرار', seconds: 'ث', rest: 'راحة', rpe: 'الصعوبة (RPE)', activity: 'سجل نشاط',
  weekly: 'تحديات الأسبوع', achievements: 'الإنجازات', newQuest: 'مهمة جديدة', done: 'تم', checkin: 'تقييم المساء', energyLvl: 'الطاقة', soreness: 'الألم العضلي', mood: 'المزاج', sleep: 'النوم (س)',
  logWeight: 'سجل الوزن', report: 'تقييم الأسبوع', generate: 'إنشاء', apply: 'طبق الاقتراح', photos: 'صور التقدم (خاصة)', measurements: 'القياسات',
  language: 'اللغة', notifications: 'الإشعارات', edit: 'تعديل', favorites: 'المفضلة', planDay: 'خطط يومي', ideas: 'أفكار وجبات',
};
const dar: D = {
  home: 'Dar', system: 'The System', nutrition: 'Makla', library: 'Wasafat', workout: 'Tamarin', quests: 'Quests', progress: 'Taqaddom', profile: 'Profil',
  level: 'Level', streak: 'Streak', rank: 'Rank', status: 'Status', energy: 'Énergie · Lyoum', remaining: 'B9a', protein: 'Protein', carbs: 'Glucides', fat: 'Dhoun', fiber: 'Alyaf',
  water: 'Lma', weight: 'Lwazn', dailyQuest: 'Quest dyal lyoum', openQuests: 'Ga3 l quests', todaysDungeon: 'Dungeon dyal lyoum', restDay: 'Nhar ra7a', enter: 'Dkhol', vitals: 'L2ar9am',
  breakfast: 'Lftour', lunch: 'Lghda', dinner: 'L3cha', snack: 'Snack', add: 'Zid', save: 'Sjjel', cancel: 'Lgha', delete: 'Ms7', close: 'Sedd', search: '9leb', loading: 'Kaytchargé…',
  estimate: 'Ta9dir AI', addFood: 'Zid makla', searchFood: '9leb 3la makla', customFood: 'Makla dyalk', grams: 'gram', servings: 'portions', perServing: 'l portion',
  signIn: 'Dkhol l bab', signUp: 'Fi9 (compte jdid)', email: 'Email', password: 'Mot de passe', forgot: 'Nsiti mot de passe?', signOut: 'Khrej',
  talk: 'Hder m3a THE SYSTEM… (Darija, العربية, Français, English)', send: 'Sift', photo: 'Tswira', voice: 'Sout',
  start: 'Bda l7issa', finish: 'Sali tamrin', logSet: 'Sjjel set', sets: 'sets', reps: 'reps', seconds: 's', rest: 'ra7a', rpe: 'Ch7al kan s3ib? (RPE)', activity: 'Sjjel nachat',
  weekly: 'Tahadiyat dyal simana', achievements: 'Injazat', newQuest: 'Quest jdida', done: 'Salat', checkin: 'Ta9yim dyal lil', energyLvl: 'Énergie', soreness: 'L3ya', mood: 'Lmood', sleep: 'N3as (h)',
  logWeight: 'Sjjel lwazn', report: 'Ta9yim dyal simana', generate: 'Wjjed', apply: 'Tb9 l i9tira7', photos: 'Tsawer (privé)', measurements: 'L9iyasat',
  language: 'Lougha', notifications: 'Notifications', edit: 'Bddel', favorites: 'Mfadlin', planDay: 'Nddem nhari', ideas: 'Afkar dyal makla',
};
const DICT: Record<Lang, D> = { en, fr, ar, dar };
let current: Lang = 'dar';
try { current = (localStorage.getItem('sf_lang') as Lang) || 'dar'; } catch { /* storage blocked */ }
export function setLang(l: Lang) { current = l; try { localStorage.setItem('sf_lang', l); } catch { /* ignore */ } document.documentElement.lang = l === 'dar' ? 'ar-MA' : l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'; }
export const lang = () => current;
export const t = (k: string) => DICT[current][k] ?? en[k] ?? k;
export const LANGS: { id: Lang; label: string }[] = [{ id: 'dar', label: 'Darija' }, { id: 'ar', label: 'العربية' }, { id: 'fr', label: 'Français' }, { id: 'en', label: 'English' }];

/** System quest titles are rebuilt in the UI language from the quest key. */
export function questTitle(q: { key: string; kind: string; title: string; target: number; unit?: string | null }): string {
  const L = current; const n = Number(q.target);
  const T: Record<string, Record<Lang, string>> = {
    workout: { en: q.title, fr: 'Termine le donjon du jour', ar: 'أنجز تمرين اليوم', dar: 'Kmmel dungeon dyal lyoum' },
    walk: { en: `Walk ${n} minutes`, fr: `Marche ${n} minutes`, ar: `امشِ ${n} دقيقة`, dar: `Tmchi ${n} d9i9a` },
    mobility: { en: 'Mobility ritual · 5 minutes', fr: 'Mobilité · 5 minutes', ar: 'تمارين المرونة · 5 دقائق', dar: 'Mobilité · 5 d9aye9' },
    meals: { en: 'Record your meals', fr: 'Note tes repas', ar: 'سجل وجباتك', dar: 'Sjjel l makla dyalk' },
    protein: { en: `Reach ${n} g protein`, fr: `Atteins ${n} g de protéines`, ar: `اوصل ${n} غ بروتين`, dar: `Wsl ${n} g protein` },
    water: { en: `Drink ${(n / 1000).toFixed(1)} L water`, fr: `Bois ${(n / 1000).toFixed(1)} L d’eau`, ar: `اشرب ${(n / 1000).toFixed(1)} ل ماء`, dar: `Chrb ${(n / 1000).toFixed(1)} L d lma` },
    evaluation: { en: 'Evening evaluation', fr: 'Bilan du soir', ar: 'تقييم المساء', dar: 'Ta9yim dyal lil' },
  };
  if (q.key.startsWith('ex:') || q.kind === 'custom') return q.title;
  return T[q.key]?.[L] ?? q.title;
}
