// Predefined educational content, supportive messages and exercises (written by hand, no generation).
// Four languages: en, fr, ar (Modern Standard Arabic), dar (Moroccan Darija, Arabic script).
import type { RecipeIngredient } from './recipes';

export type L4 = { en: string; fr: string; ar: string; dar: string };
export function t4(v: L4, lang: string): string { return (v as any)[lang] || v.en; }
const L = (en: string, fr: string, ar: string, dar: string): L4 => ({ en, fr, ar, dar });

// ---------------- Supportive messages ----------------
export const MSG = {
  overTarget: [
    L('Today you went over your estimated calorie target. It’s okay. One day does not define your progress. Return to your normal balanced routine at your next meal.',
      'Aujourd’hui, vous avez dépassé votre objectif calorique estimé. Ce n’est pas grave. Une journée ne définit pas votre progression. Reprenez votre routine équilibrée au prochain repas.',
      'تجاوزتِ اليوم هدفك التقديري من السعرات. لا بأس، يوم واحد لا يحدد تقدمك. عودي إلى روتينك المتوازن في وجبتك القادمة.',
      'اليوم فتّي الهدف ديال الكالوري شوية. ماشي مشكل، نهار واحد ما كيحددش التقدم ديالك. رجعي للروتين المتوازن ديالك فالماكلة الجاية.'),
    L('Targets are estimates, not rules. Eat your next meal as usual — no need to skip or compensate.',
      'Les objectifs sont des estimations, pas des règles. Prenez votre prochain repas normalement — inutile de sauter un repas ou de compenser.',
      'الأهداف تقديرات وليست قواعد. تناولي وجبتك القادمة كالمعتاد، لا داعي لتخطيها أو للتعويض.',
      'الأهداف غير تقديرات ماشي قوانين. كولي الماكلة الجاية عادي، ما تحتاجيش تزكليها ولا تعوضي.'),
  ],
  addedSugar: L('Your added sugar today is above the guidance you chose. This is information, not a judgement. Water, unsweetened tea or fruit can be nice options next time.',
    'Votre sucre ajouté aujourd’hui dépasse le repère que vous avez choisi. C’est une information, pas un jugement. L’eau, le thé non sucré ou un fruit sont de bonnes options la prochaine fois.',
    'السكر المضاف اليوم أعلى من الإرشاد الذي اخترته. هذه معلومة وليست حكما. الماء أو الشاي بدون سكر أو الفاكهة خيارات جيدة في المرة القادمة.',
    'السكر المضاف اليوم فايت الحد اللي ختاريتي. هادي غير معلومة ماشي حكم. الما، أتاي بلا سكر ولا شي فاكهة اختيارات زوينة المرة الجاية.'),
  noGuilt: L('You do not need to feel guilty about eating. Try to understand what your body and emotions need.',
    'Vous n’avez pas à culpabiliser de manger. Essayez de comprendre ce dont votre corps et vos émotions ont besoin.',
    'لا داعي للشعور بالذنب بسبب الأكل. حاولي أن تفهمي ما يحتاجه جسمك ومشاعرك.',
    'ما خاصكش تحسي بالذنب حيت كليتي. حاولي تفهمي شنو محتاج جسمك والإحساس ديالك.'),
  physical: L('It sounds like physical hunger. Your body needs energy — a balanced meal or snack is a good choice. Eat slowly and enjoy it.',
    'Cela ressemble à une faim physique. Votre corps a besoin d’énergie — un repas ou une collation équilibrée est un bon choix. Mangez lentement et savourez.',
    'يبدو أنه جوع جسدي. جسمك يحتاج إلى طاقة، والوجبة أو اللمجة المتوازنة اختيار جيد. كلي ببطء واستمتعي.',
    'باين جوع ديال الجسم. جسمك محتاج الطاقة، ماكلة ولا لمجة متوازنة اختيار مزيان. كولي بشوية وتهناي.'),
  emotional: L('It sounds like your emotions may be asking for care. Eating is allowed — and you might also try a short breathing exercise or write down how you feel.',
    'Vos émotions semblent demander de l’attention. Manger est permis — vous pouvez aussi essayer une courte respiration ou écrire ce que vous ressentez.',
    'يبدو أن مشاعرك تحتاج إلى اهتمام. الأكل مسموح، ويمكنك أيضا تجربة تمرين تنفس قصير أو كتابة ما تشعرين به.',
    'باين الإحساس ديالك محتاج شوية الاهتمام. الماكلة مسموحة، وتقدري حتى تجربي تمرين ديال التنفس ولا تكتبي شنو حاسة.'),
  craving: L('A craving for a specific food is normal. You can enjoy a portion mindfully, sitting down, without distractions.',
    'Une envie d’un aliment précis est normale. Vous pouvez en savourer une portion en pleine conscience, assise, sans distraction.',
    'الرغبة في طعام معين أمر طبيعي. يمكنك الاستمتاع بحصة منه بوعي، جالسة ودون تشتيت.',
    'الشهوة لشي ماكلة معينة حاجة عادية. تقدري تاكلي حصة منها بالوعي، گالسة وبلا تلفون.'),
  professional: L('You have noted feeling a loss of control or strong distress several times recently. You deserve support: consider talking to a doctor, dietitian or psychologist. In an emergency, contact local emergency services.',
    'Vous avez noté plusieurs fois récemment une perte de contrôle ou une forte détresse. Vous méritez du soutien : pensez à consulter un médecin, un(e) diététicien(ne) ou un(e) psychologue. En cas d’urgence, contactez les services d’urgence.',
    'سجلتِ مؤخرا عدة مرات شعورا بفقدان السيطرة أو ضيقا شديدا. أنتِ تستحقين الدعم: فكري في التحدث إلى طبيب أو أخصائي تغذية أو أخصائي نفسي. في حالة الطوارئ اتصلي بخدمات الإسعاف.',
    'سجلتي هاد الأيام بزاف ديال المرات أنك حسيتي بفقدان السيطرة ولا بضيقة كبيرة. نتي كتستاهلي الدعم: فكري تهضري مع طبيب، أخصائي تغذية ولا أخصائي نفساني. فحالة الطوارئ عيطي للإسعاف.'),
};

export const POSITIVE_REMINDERS: L4[] = [
  L('Progress is not linear. Small steps count.', 'Le progrès n’est pas linéaire. Les petits pas comptent.', 'التقدم ليس خطا مستقيما. الخطوات الصغيرة مهمة.', 'التقدم ماشي خط مستقيم. الخطوات الصغيرة كتحسب.'),
  L('Your worth is not measured in kilograms.', 'Votre valeur ne se mesure pas en kilos.', 'قيمتك لا تقاس بالكيلوغرامات.', 'القيمة ديالك ما كتقاسش بالكيلو.'),
  L('Every meal is a new opportunity to nourish yourself.', 'Chaque repas est une nouvelle occasion de vous nourrir.', 'كل وجبة فرصة جديدة لتغذية نفسك.', 'كل ماكلة فرصة جديدة باش تغذي راسك.'),
  L('Rest is part of a healthy routine.', 'Le repos fait partie d’une routine saine.', 'الراحة جزء من الروتين الصحي.', 'الراحة جزء من الروتين الصحي.'),
  L('Be as kind to yourself as you are to the people you love.', 'Soyez aussi bienveillante avec vous-même qu’avec ceux que vous aimez.', 'كوني لطيفة مع نفسك كما أنت مع من تحبين.', 'كوني حنينة مع راسك بحال ما كتكوني مع الناس اللي كتبغي.'),
];

// ---------------- Hunger check-in ----------------
export const CHECKIN_QUESTIONS: { id: string; q: L4; leans: 'physical' | 'emotional' | 'craving' }[] = [
  { id: 'physical', leans: 'physical', q: L('Am I physically hungry? (stomach growling, low energy, it has been hours since I ate)', 'Ai-je physiquement faim ? (ventre qui gargouille, fatigue, plusieurs heures depuis le dernier repas)', 'هل أنا جائعة جسديا؟ (قرقرة البطن، تعب، مرت ساعات على آخر وجبة)', 'واش أنا جيعانة بصح؟ (كرشي كتغرغر، عيانة، دازو سوايع من آخر ماكلة)') },
  { id: 'stressed', leans: 'emotional', q: L('Am I stressed?', 'Suis-je stressée ?', 'هل أنا متوترة؟', 'واش أنا مستريسية؟') },
  { id: 'bored', leans: 'emotional', q: L('Am I bored?', 'Est-ce que je m’ennuie ?', 'هل أشعر بالملل؟', 'واش أنا مقلقة / مملة؟') },
  { id: 'sad', leans: 'emotional', q: L('Am I sad?', 'Suis-je triste ?', 'هل أنا حزينة؟', 'واش أنا حزينة؟') },
  { id: 'anxious', leans: 'emotional', q: L('Am I anxious?', 'Suis-je anxieuse ?', 'هل أنا قلقة؟', 'واش أنا خايفة / قلقانة؟') },
  { id: 'craving', leans: 'craving', q: L('Am I craving a specific food?', 'Ai-je envie d’un aliment précis ?', 'هل أشتهي طعاما معينا؟', 'واش كنشتهي شي ماكلة معينة؟') },
  { id: 'trigger', leans: 'emotional', q: L('Did something happen just before this craving?', 'S’est-il passé quelque chose juste avant cette envie ?', 'هل حدث شيء قبل هذه الرغبة مباشرة؟', 'واش وقع شي حاجة قبل هاد الشهوة؟') },
];

// ---------------- Breathing & relaxation ----------------
export interface Breathing { id: string; name: L4; desc: L4; pattern: { phase: 'in' | 'hold' | 'out' | 'hold2'; sec: number }[]; cycles: number }
export const BREATHING: Breathing[] = [
  { id: 'box', name: L('Box breathing (4-4-4-4)', 'Respiration carrée (4-4-4-4)', 'التنفس المربع (4-4-4-4)', 'التنفس المربع (4-4-4-4)'),
    desc: L('Breathe in, hold, breathe out and hold — 4 seconds each.', 'Inspirez, retenez, expirez, retenez — 4 secondes chacun.', 'شهيق، حبس، زفير، حبس — 4 ثوان لكل مرحلة.', 'دخلي النفس، حبسي، خرجيه، حبسي — 4 ثواني لكل وحدة.'),
    pattern: [{ phase: 'in', sec: 4 }, { phase: 'hold', sec: 4 }, { phase: 'out', sec: 4 }, { phase: 'hold2', sec: 4 }], cycles: 4 },
  { id: '478', name: L('Relaxing breath (4-7-8)', 'Respiration relaxante (4-7-8)', 'التنفس المهدئ (4-7-8)', 'التنفس اللي كيهدن (4-7-8)'),
    desc: L('In for 4, hold for 7, out slowly for 8.', 'Inspirez 4, retenez 7, expirez lentement 8.', 'شهيق 4، حبس 7، زفير بطيء 8.', 'دخلي 4، حبسي 7، خرجي بشوية 8.'),
    pattern: [{ phase: 'in', sec: 4 }, { phase: 'hold', sec: 7 }, { phase: 'out', sec: 8 }], cycles: 4 },
  { id: 'calm', name: L('Calm breathing (4-6)', 'Respiration calme (4-6)', 'التنفس الهادئ (4-6)', 'تنفس هادي (4-6)'),
    desc: L('A longer out-breath helps your body relax.', 'Une expiration plus longue aide le corps à se détendre.', 'الزفير الأطول يساعد الجسم على الاسترخاء.', 'ملي كتخرجي النفس بشوية كيرتاح الجسم.'),
    pattern: [{ phase: 'in', sec: 4 }, { phase: 'out', sec: 6 }], cycles: 6 },
];

export const GUIDED_STRESS: { title: L4; sec: number; text: L4 }[] = [
  { sec: 20, title: L('Pause', 'Pause', 'توقفي', 'وقفي'), text: L('Stop what you are doing. Put both feet on the floor and let your shoulders drop.', 'Arrêtez ce que vous faites. Posez les deux pieds au sol et relâchez les épaules.', 'توقفي عما تفعلينه. ضعي قدميك على الأرض وأرخي كتفيك.', 'وقفي داكشي اللي كديري. حطي رجليك بجوج فالأرض وطلقي كتافك.') },
  { sec: 40, title: L('Breathe', 'Respirez', 'تنفسي', 'تنفسي'), text: L('Breathe in through your nose for 4 seconds, out through your mouth for 6. Repeat slowly.', 'Inspirez par le nez 4 secondes, expirez par la bouche 6 secondes. Répétez lentement.', 'خذي شهيقا من الأنف 4 ثوان، وزفيرا من الفم 6 ثوان. كرري ببطء.', 'دخلي النفس من نيفك 4 ثواني، وخرجيه من فمك 6. عاودي بشوية.') },
  { sec: 40, title: L('5-4-3-2-1', '5-4-3-2-1', '5-4-3-2-1', '5-4-3-2-1'), text: L('Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell and 1 you taste.', 'Nommez 5 choses que vous voyez, 4 que vous touchez, 3 que vous entendez, 2 que vous sentez et 1 que vous goûtez.', 'سمي 5 أشياء ترينها، 4 تلمسينها، 3 تسمعينها، 2 تشمينها وواحدا تتذوقينه.', 'سمي 5 حوايج كتشوفي، 4 كتقيسي، 3 كتسمعي، 2 كتشمي و1 كتذوقي.') },
  { sec: 30, title: L('Notice', 'Observez', 'لاحظي', 'لاحظي'), text: L('What emotion is here right now? Name it without judging it: “I feel …”.', 'Quelle émotion est là maintenant ? Nommez-la sans la juger : « Je ressens… ».', 'ما الشعور الموجود الآن؟ سميه دون حكم: «أشعر بـ...».', 'شنو هو الإحساس اللي كاين دابا؟ سميه بلا ما تحكمي عليه: «أنا حاسة ب...».') },
  { sec: 30, title: L('Choose', 'Choisissez', 'اختاري', 'ختاري'), text: L('What would help most now? Water, a short walk, calling someone, a snack, or rest. Any choice is allowed.', 'Qu’est-ce qui aiderait le plus maintenant ? De l’eau, une courte marche, appeler quelqu’un, une collation ou du repos. Tous les choix sont permis.', 'ما الذي يساعدك أكثر الآن؟ الماء، مشي قصير، الاتصال بشخص، لمجة أو راحة. كل الخيارات مسموحة.', 'شنو اللي غادي يعاونك دابا؟ شوية د الما، تمشية صغيرة، تعيطي لشي حد، لمجة ولا ترتاحي. كلشي مسموح.') },
];

export const RELAXATION: { title: L4; text: L4 }[] = [
  { title: L('Body scan (3 min)', 'Scan corporel (3 min)', 'مسح الجسم (3 دقائق)', 'تفقد الجسم (3 دقايق)'), text: L('Close your eyes. Move your attention slowly from your feet to your head, relaxing each area as you go.', 'Fermez les yeux. Déplacez lentement votre attention des pieds à la tête en relâchant chaque zone.', 'أغمضي عينيك. حركي انتباهك ببطء من القدمين إلى الرأس مع إرخاء كل منطقة.', 'غمضي عينيك. دوزي الانتباه ديالك بشوية من رجليك حتى لراسك وطلقي كل بلاصة.') },
  { title: L('Mindful tea', 'Thé en pleine conscience', 'شاي بوعي', 'أتاي بالوعي'), text: L('Make a cup of unsweetened tea. Notice its colour, warmth and smell. Sip slowly for a few minutes without your phone.', 'Préparez un thé non sucré. Observez sa couleur, sa chaleur, son odeur. Buvez lentement quelques minutes sans téléphone.', 'حضري كوب شاي بدون سكر. لاحظي لونه ودفأه ورائحته. اشربيه ببطء بضع دقائق دون هاتف.', 'وجدي كاس أتاي بلا سكر. شوفي اللون والسخانة والريحة ديالو. شربيه بشوية بلا تلفون.') },
  { title: L('Mindful eating', 'Manger en pleine conscience', 'الأكل بوعي', 'الماكلة بالوعي'), text: L('Sit down, put the food on a plate, take the first three bites slowly and notice taste and texture.', 'Asseyez-vous, servez dans une assiette, prenez les trois premières bouchées lentement en observant goût et texture.', 'اجلسي، ضعي الطعام في صحن، وتناولي أول ثلاث لقمات ببطء مع ملاحظة الطعم والقوام.', 'گلسي، حطي الماكلة فطبسيل، وكولي أول تلت لقمات بشوية ولاحظي الطعم.') },
];

export const STRESS_TIPS: L4[] = [
  L('Keep regular meals: long gaps often make cravings stronger.', 'Gardez des repas réguliers : les longues pauses renforcent souvent les envies.', 'حافظي على وجبات منتظمة: الفترات الطويلة دون أكل تقوي الرغبات غالبا.', 'خلي الماكلة فوقتها: ملي كتطول المدة بلا ماكلة كتزيد الشهوة.'),
  L('Sleep affects appetite. Aim for a regular bedtime.', 'Le sommeil influence l’appétit. Visez un coucher régulier.', 'النوم يؤثر على الشهية. حاولي النوم في وقت منتظم.', 'النعاس كيأثر على الشهية. حاولي تنعسي فوقت منتظم.'),
  L('A 10-minute walk outside can lower tension.', 'Une marche de 10 minutes dehors peut réduire la tension.', 'المشي 10 دقائق في الخارج قد يخفف التوتر.', 'تمشية ديال 10 دقايق برا تقدر تنقص الستريس.'),
  L('Talk to someone you trust when things feel heavy.', 'Parlez à une personne de confiance quand c’est lourd.', 'تحدثي مع شخص تثقين به عندما تشعرين بالثقل.', 'هضري مع شي حد كتيقي فيه ملي تحسي بالتقل.'),
  L('Write three things that went well today.', 'Écrivez trois choses qui se sont bien passées aujourd’hui.', 'اكتبي ثلاثة أشياء جيدة حدثت اليوم.', 'كتبي تلت حوايج مزيانين وقعو اليوم.'),
];

export const COPING: L4[] = [
  L('Drink a glass of water', 'Boire un verre d’eau', 'اشربي كوب ماء', 'شربي كاس د الما'),
  L('Take a 10-minute walk', 'Faire une marche de 10 minutes', 'امشي 10 دقائق', 'تمشاي 10 دقايق'),
  L('Call or message a friend', 'Appeler ou écrire à une amie', 'اتصلي أو راسلي صديقة', 'عيطي ولا صيفطي ميساج لصاحبتك'),
  L('Write in your journal', 'Écrire dans votre journal', 'اكتبي في مذكراتك', 'كتبي فالمذكرات ديالك'),
  L('Listen to calm music', 'Écouter une musique calme', 'استمعي إلى موسيقى هادئة', 'سمعي شي موسيقى هادية'),
  L('Stretch for 5 minutes', 'S’étirer 5 minutes', 'تمددي 5 دقائق', 'تمططي 5 دقايق'),
  L('Take a warm shower', 'Prendre une douche chaude', 'خذي حماما دافئا', 'دوشي بالما سخون'),
];

export const HABITS: { id: string; label: L4 }[] = [
  { id: 'veg', label: L('Ate vegetables at 2 meals', 'Légumes à 2 repas', 'تناولت الخضر في وجبتين', 'كليت الخضرة فجوج ماكلات') },
  { id: 'fruit', label: L('Ate 2 portions of fruit', '2 portions de fruits', 'تناولت حصتين من الفاكهة', 'كليت جوج حصص د الفاكهة') },
  { id: 'breakfast', label: L('Had breakfast', 'Petit-déjeuner pris', 'تناولت الفطور', 'فطرت') },
  { id: 'slow', label: L('Ate at least one meal slowly, seated', 'Un repas lentement, assise', 'تناولت وجبة واحدة على الأقل ببطء وأنا جالسة', 'كليت ماكلة وحدة على الأقل بشوية وأنا گالسة') },
  { id: 'nosoda', label: L('Chose water instead of a sugary drink', 'Eau plutôt qu’une boisson sucrée', 'اخترت الماء بدل مشروب محلى', 'ختاريت الما بلاصت مشروب فيه السكر') },
  { id: 'sleep', label: L('Went to bed at a regular time', 'Coucher à heure régulière', 'نمت في وقت منتظم', 'نعست فوقت منتظم') },
  { id: 'kind', label: L('Spoke kindly to myself', 'Bienveillante envers moi-même', 'تحدثت إلى نفسي بلطف', 'هضرت مع راسي بالحنانة') },
];

// ---------------- Education ----------------
export const SUGAR_EDU: { title: L4; text: L4 }[] = [
  { title: L('Added sugar', 'Sucre ajouté', 'السكر المضاف', 'السكر المضاف'),
    text: L('Sugars added during processing or preparation (table sugar, honey, syrups, sugar in sodas and sweets). The WHO recommends keeping added (free) sugars under 10 % of daily energy, with additional benefits under 5 %.',
      'Sucres ajoutés lors de la fabrication ou de la préparation (sucre, miel, sirops, sucre des sodas et confiseries). L’OMS recommande de rester sous 10 % de l’énergie quotidienne, avec des bénéfices supplémentaires sous 5 %.',
      'السكريات المضافة أثناء التصنيع أو التحضير (السكر، العسل، الشراب، السكر في المشروبات الغازية والحلويات). توصي منظمة الصحة العالمية بأن تبقى أقل من 10٪ من الطاقة اليومية، مع فوائد إضافية تحت 5٪.',
      'السكر اللي كيتزاد فالصناعة ولا فالطياب (السكر، العسل، الشراب، السكر فالمونادا والحلويات). منظمة الصحة العالمية كتنصح يبقى أقل من 10٪ من الطاقة ديال النهار، وأحسن تحت 5٪.') },
  { title: L('Fruit sugar', 'Sucre des fruits', 'سكر الفاكهة', 'السكر ديال الفاكهة'),
    text: L('Whole fruit contains natural sugar together with fibre, water, vitamins and minerals. Whole fruit is not counted as added sugar and is part of a healthy diet. Fruit juice is less filling than whole fruit.',
      'Le fruit entier contient du sucre naturel accompagné de fibres, d’eau, de vitamines et de minéraux. Il ne compte pas comme sucre ajouté et fait partie d’une alimentation saine. Le jus rassasie moins que le fruit entier.',
      'تحتوي الفاكهة الكاملة على سكر طبيعي مع الألياف والماء والفيتامينات والمعادن. لا تحسب سكرا مضافا وهي جزء من نظام صحي. العصير أقل إشباعا من الفاكهة الكاملة.',
      'الفاكهة الكاملة فيها سكر طبيعي مع الألياف والما والفيتامينات. ما كتحسبش سكر مضاف وهي جزء من الماكلة الصحية. العصير ما كيشبعش بحال الفاكهة الكاملة.') },
  { title: L('Milk sugar (lactose)', 'Sucre du lait (lactose)', 'سكر الحليب (اللاكتوز)', 'السكر ديال الحليب (اللاكتوز)'),
    text: L('Plain milk, yogurt and lben naturally contain lactose. This is not added sugar. Flavoured or sweetened dairy products may also contain added sugar — check the label.',
      'Le lait, le yaourt nature et le lben contiennent naturellement du lactose. Ce n’est pas du sucre ajouté. Les produits laitiers aromatisés ou sucrés peuvent en contenir — vérifiez l’étiquette.',
      'يحتوي الحليب والياغورت الطبيعي واللبن على اللاكتوز بشكل طبيعي، وهو ليس سكرا مضافا. المنتجات المنكهة أو المحلاة قد تحتوي على سكر مضاف — راجعي الملصق.',
      'الحليب والياغورت والبن فيهم اللاكتوز بطبيعتهم، وهادا ماشي سكر مضاف. المنتوجات اللي فيها النكهة ولا محلية يقدر يكون فيها سكر مضاف — شوفي الملصق.') },
  { title: L('Sugary drinks', 'Boissons sucrées', 'المشروبات المحلاة', 'المشروبات اللي فيها السكر'),
    text: L('A 330 ml can of regular soda contains around 30–35 g of sugar. Drinks are an easy place to reduce added sugar without changing meals: try water, sparkling water, or tea with less sugar.',
      'Une canette de soda de 330 ml contient environ 30 à 35 g de sucre. Les boissons sont un levier simple pour réduire le sucre ajouté : eau, eau gazeuse, ou thé moins sucré.',
      'تحتوي علبة مشروب غازي 330 مل على حوالي 30-35 غ من السكر. المشروبات طريقة سهلة لتقليل السكر المضاف: الماء، الماء الغازي، أو الشاي بسكر أقل.',
      'كانيط ديال المونادا 330 مل فيها تقريبا 30-35 غرام د السكر. المشروبات طريقة ساهلة باش تنقصي السكر: الما، الما بالغاز، ولا أتاي بسكر قليل.') },
  { title: L('Packaged sweets', 'Confiseries emballées', 'الحلويات المعلبة', 'الحلويات المعلبة'),
    text: L('Biscuits, cakes, chocolate bars and breakfast cereals often contain added sugar. Reading the label (sugar per 100 g) helps compare products. Enjoying sweets sometimes is part of normal eating.',
      'Biscuits, gâteaux, barres chocolatées et céréales contiennent souvent du sucre ajouté. Lire l’étiquette (sucres pour 100 g) aide à comparer. Se faire plaisir parfois fait partie d’une alimentation normale.',
      'غالبا ما يحتوي البسكويت والكيك وألواح الشوكولاتة وحبوب الإفطار على سكر مضاف. قراءة الملصق (السكر لكل 100 غ) تساعد على المقارنة. الاستمتاع بالحلويات أحيانا جزء من الأكل الطبيعي.',
      'البيسكوي والكيك والشوكولاط والسيريال غالبا فيهم السكر المضاف. قراية الملصق (السكر ف100 غرام) كتعاون تقارني. تاكلي شي حلوة مرة مرة حاجة عادية.') },
  { title: L('Important', 'Important', 'مهم', 'مهم'),
    text: L('This tracker does not provide diabetes treatment advice. If you have diabetes or another medical condition, follow the plan agreed with your healthcare team. There is no need to eliminate fruit, milk or carbohydrates.',
      'Ce suivi ne fournit pas de conseils de traitement du diabète. Si vous avez un diabète ou une autre maladie, suivez le plan établi avec votre équipe soignante. Inutile d’éliminer fruits, lait ou glucides.',
      'هذا المتتبع لا يقدم نصائح لعلاج السكري. إذا كنت مصابة بالسكري أو بحالة طبية، اتبعي الخطة المتفق عليها مع فريقك الصحي. لا داعي لإلغاء الفاكهة أو الحليب أو النشويات.',
      'هاد التتبع ما كيعطيش نصائح لعلاج السكري. إلا عندك السكري ولا شي مرض، تبعي الخطة ديال الطبيب ديالك. ما خاصكش تحيدي الفاكهة ولا الحليب ولا النشويات.') },
];

export const DETOX_NOTE = L('These drinks are simple ways to enjoy water. They do not “detox”, burn fat or clean the liver: your liver and kidneys already do the body’s natural detoxification. Avoid laxative “detox” products.',
  'Ces boissons sont une façon agréable de boire de l’eau. Elles ne « détoxifient » pas, ne brûlent pas les graisses et ne nettoient pas le foie : le foie et les reins assurent déjà la détoxification naturelle. Évitez les produits « détox » laxatifs.',
  'هذه المشروبات طريقة بسيطة للاستمتاع بالماء. إنها لا «تزيل السموم» ولا تحرق الدهون ولا تنظف الكبد: الكبد والكليتان يقومان بإزالة السموم بشكل طبيعي. تجنبي منتجات «الديتوكس» الملينة.',
  'هاد المشروبات غير طريقة زوينة باش تشربي الما. ما كيديروش «ديتوكس»، ما كيحرقوش الشحمة وما كينقيوش الكبدة: الكبدة والكلاوي هوما اللي كيديرو هاد الخدمة بطبيعتهم. بعدي من منتوجات «الديتوكس» اللي كتسهل.');

export const WEIGHT_NOTE = L('Body weight naturally changes by 0.5–2 kg from day to day because of water, salt, food in the digestive tract, hormones and the menstrual cycle. Weekly averages show your trend better than a single weigh-in.',
  'Le poids varie naturellement de 0,5 à 2 kg d’un jour à l’autre (eau, sel, digestion, hormones, cycle menstruel). Les moyennes hebdomadaires montrent mieux la tendance qu’une seule pesée.',
  'يتغير وزن الجسم طبيعيا بين 0.5 و2 كغ من يوم لآخر بسبب الماء والملح والطعام في الجهاز الهضمي والهرمونات والدورة الشهرية. المتوسط الأسبوعي يوضح الاتجاه أفضل من وزنة واحدة.',
  'الوزن كيتبدل بطبيعتو بين 0.5 و2 كيلو من نهار لنهار بسبب الما، الملحة، الماكلة فالمعدة، الهرمونات والعادة الشهرية. المعدل ديال السيمانة كيبين الاتجاه أحسن من وزنة وحدة.');

export const ESTIMATE_NOTE = L('All values are estimates calculated with standard formulas (Mifflin-St Jeor). They are not exact medical measurements. Recalculate when your weight or activity changes, and ask a healthcare professional for individual advice.',
  'Toutes les valeurs sont des estimations calculées avec des formules standard (Mifflin-St Jeor). Ce ne sont pas des mesures médicales exactes. Recalculez quand votre poids ou votre activité change et demandez un avis individuel à un professionnel de santé.',
  'جميع القيم تقديرات محسوبة بمعادلات معيارية (ميفلين-سان جيور). ليست قياسات طبية دقيقة. أعيدي الحساب عند تغير وزنك أو نشاطك، واستشيري مختصا صحيا للحصول على نصيحة فردية.',
  'كاع الأرقام تقديرات محسوبة بمعادلات معروفة (ميفلين-سان جيور). ماشي قياسات طبية دقيقة. عاودي الحساب ملي يتبدل الوزن ولا النشاط، وسولي مختص صحي على نصيحة خاصة بيك.');

// ---------------- Healthy drinks ----------------
export interface Drink { id: string; name: L4; ingredients: (RecipeIngredient & { label?: L4 })[]; prep: L4; servings: number; serving: L4 }
const di = (s: string) => s.trim().split(/\s+/).map(p => { const [foodId, g, f] = p.split(':'); return { foodId, grams: Number(g), ...(f === 'x' ? { consumed: false } : {}) }; });
export const DRINKS: Drink[] = [
  { id: 'lemon_mint', servings: 4, serving: L('1 glass (250 ml)', '1 verre (250 ml)', 'كوب (250 مل)', 'كاس (250 مل)'),
    name: L('Lemon & mint water', 'Eau citron-menthe', 'ماء بالليمون والنعناع', 'الما بالحامض والنعناع'),
    ingredients: di('water:1000 lemon_juice:30 mint:10:x'),
    prep: L('Add the juice of half a lemon and a handful of mint leaves to 1 L of cold water. Chill 30 minutes.', 'Ajouter le jus d’un demi-citron et une poignée de menthe à 1 L d’eau froide. Réfrigérer 30 minutes.', 'أضيفي عصير نصف ليمونة وحفنة نعناع إلى لتر ماء بارد. بردي 30 دقيقة.', 'زيدي عصير نص حامضة وشوية ديال النعناع للتر ديال الما البارد. خليه فالثلاجة 30 دقيقة.') },
  { id: 'cucumber', servings: 4, serving: L('1 glass (250 ml)', '1 verre (250 ml)', 'كوب (250 مل)', 'كاس (250 مل)'),
    name: L('Cucumber water', 'Eau au concombre', 'ماء بالخيار', 'الما بالخيار'),
    ingredients: di('water:1000 cucumber:100:x mint:5:x'),
    prep: L('Slice half a cucumber into 1 L of water, add a few mint leaves and chill 1 hour.', 'Couper un demi-concombre en rondelles dans 1 L d’eau, ajouter quelques feuilles de menthe et réfrigérer 1 heure.', 'قطعي نصف خيارة شرائح في لتر ماء مع أوراق نعناع وبردي ساعة.', 'قطعي نص خيارة طرف طرف فلتر ديال الما مع شي ورقات نعناع، وخليه ساعة فالثلاجة.') },
  { id: 'ginger', servings: 2, serving: L('1 cup (250 ml)', '1 tasse (250 ml)', 'كوب (250 مل)', 'كاس (250 مل)'),
    name: L('Ginger infusion', 'Infusion au gingembre', 'منقوع الزنجبيل', 'منقوع السكنجبير'),
    ingredients: di('water:500 ginger:15:x lemon_juice:10'),
    prep: L('Simmer thin slices of fresh ginger in 500 ml water for 10 minutes. Add a little lemon juice. No sugar needed.', 'Faire frémir de fines tranches de gingembre dans 500 ml d’eau 10 minutes. Ajouter un peu de citron. Sans sucre.', 'اغلي شرائح رقيقة من الزنجبيل في 500 مل ماء 10 دقائق. أضيفي قليلا من الليمون. بدون سكر.', 'غلي طريفات رقاق ديال السكنجبير ف500 مل د الما 10 دقايق. زيدي شوية د الحامض. بلا سكر.') },
  { id: 'herbal', servings: 1, serving: L('1 cup (250 ml)', '1 tasse (250 ml)', 'كوب (250 مل)', 'كاس (250 مل)'),
    name: L('Unsweetened herbal tea (verbena, chamomile…)', 'Tisane non sucrée (verveine, camomille…)', 'منقوع أعشاب بدون سكر (لويزة، بابونج…)', 'منقوع بلا سكر (لويزة، البابونج…)'),
    ingredients: di('tea_herbal:250'),
    prep: L('Steep the herbs in just-boiled water for 5 minutes. Enjoy warm.', 'Infuser les plantes 5 minutes dans de l’eau frémissante. Déguster chaud.', 'انقعي الأعشاب في ماء مغلي 5 دقائق. تشرب دافئة.', 'خلي الأعشاب فالما السخون 5 دقايق. شربيه سخون.') },
  { id: 'cinnamon_orange', servings: 4, serving: L('1 glass (250 ml)', '1 verre (250 ml)', 'كوب (250 مل)', 'كاس (250 مل)'),
    name: L('Orange & cinnamon water', 'Eau orange-cannelle', 'ماء بالبرتقال والقرفة', 'الما بالليمون والقرفة'),
    ingredients: di('water:1000 orange:100:x cinnamon:2:x'),
    prep: L('Add orange slices and a cinnamon stick to 1 L of water and chill 1 hour.', 'Ajouter des rondelles d’orange et un bâton de cannelle à 1 L d’eau, réfrigérer 1 heure.', 'أضيفي شرائح برتقال وعود قرفة إلى لتر ماء وبردي ساعة.', 'زيدي طرف د الليمون وعود د القرفة للتر د الما وخليه ساعة.') },
  { id: 'mint_tea_plain', servings: 4, serving: L('1 glass (200 ml)', '1 verre (200 ml)', 'كأس (200 مل)', 'كاس (200 مل)'),
    name: L('Mint tea without sugar', 'Thé à la menthe sans sucre', 'أتاي بالنعناع بدون سكر', 'أتاي بالنعناع بلا سكر'),
    ingredients: di('tea_green:800 mint:15:x'),
    prep: L('Prepare mint tea as usual without sugar. If you are used to sweet tea, reduce the sugar little by little.', 'Préparer le thé comme d’habitude sans sucre. Si vous avez l’habitude du thé sucré, réduisez progressivement.', 'حضري أتاي كالمعتاد بدون سكر. إن كنت معتادة على الشاي الحلو، قللي السكر تدريجيا.', 'وجدي أتاي عادي بلا سكر. إلا كنتي متعودة عليه حلو، نقصي السكر بشوية بشوية.') },
];
export const DRINK_UNCOUNTED_NOTE = L('Ingredients that are infused and removed (slices, leaves) are not counted; the small amount that passes into the water is not measured in the reference data.',
  'Les ingrédients infusés puis retirés (rondelles, feuilles) ne sont pas comptés ; la petite quantité qui passe dans l’eau n’est pas mesurée dans les données de référence.',
  'المكونات التي تنقع ثم تزال (شرائح، أوراق) لا تحسب؛ الكمية الصغيرة التي تنتقل إلى الماء غير مقاسة في البيانات المرجعية.',
  'المكونات اللي كتنقع ومن بعد كتحيد ما كتحسبش؛ الشوية اللي كيدوز للما ما مقيسش فالبيانات.');

export const AFFORDABLE_FOODS = ['egg', 'sardine_canned_oil', 'lentils_raw', 'white_beans_raw', 'chickpeas_raw', 'fava_raw', 'split_peas_cooked', 'chicken_thigh_raw',
  'potato_raw', 'tomato', 'onion', 'carrot', 'cabbage', 'zucchini', 'eggplant', 'orange', 'banana', 'apple', 'oats', 'semolina', 'buttermilk', 'yogurt_plain_whole'];

// ---------------- Notification texts ----------------
export const REMINDER_TEXT: Record<string, L4> = {
  water: L('Time for a glass of water 💧', 'C’est l’heure d’un verre d’eau 💧', 'حان وقت كوب ماء 💧', 'وقت كاس د الما 💧'),
  walk: L('A short walk can feel good. Ready for some movement?', 'Une petite marche fait du bien. Prête à bouger ?', 'المشي القصير مفيد. هل أنت مستعدة للحركة؟', 'تمشية صغيرة كتفرح. واجدة تتحركي شوية؟'),
  meals: L('Remember to record your meals in your diary.', 'Pensez à noter vos repas dans votre journal.', 'تذكري تسجيل وجباتك في يومياتك.', 'عقلي تسجلي الماكلة ديالك فالمذكرة.'),
  mealprep: L('Planning tomorrow’s meals? Check your weekly menu.', 'Vous planifiez les repas de demain ? Consultez votre menu de la semaine.', 'هل تخططين لوجبات الغد؟ راجعي قائمة الأسبوع.', 'كتوجدي الماكلة ديال غدا؟ شوفي البرنامج ديال السيمانة.'),
  habits: L('How did your healthy habits go today?', 'Comment se sont passées vos habitudes aujourd’hui ?', 'كيف كانت عاداتك الصحية اليوم؟', 'كيف دازو العادات الصحية ديالك اليوم؟'),
  report: L('Your weekly report is ready.', 'Votre bilan hebdomadaire est prêt.', 'تقريرك الأسبوعي جاهز.', 'التقرير ديال السيمانة واجد.'),
};
