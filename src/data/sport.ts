// Sport content: exercises, guided workouts and tips (written by hand).
// MET values: Compendium of Physical Activities (Ainsworth et al.). kcal = MET × weight (kg) × hours — an estimate.
export type T = { en: string; fr: string; ar: string; dar?: string };
export const tx = (v: T, lang: string) => (v as any)[lang] ?? (lang === 'dar' ? v.ar : v.en);
const L = (en: string, fr: string, ar: string, dar?: string): T => ({ en, fr, ar, ...(dar ? { dar } : {}) });

export interface Exercise { id: string; emoji: string; met: number; impact: 'low' | 'high'; level: 1 | 2 | 3; name: T; how: T }
export const EXERCISES: Exercise[] = [
  { id: 'jump_rope', emoji: '🪢', met: 11.8, impact: 'high', level: 3, name: L('Jump rope', 'Corde à sauter', 'نط الحبل', 'الحبل'),
    how: L('Small jumps on the balls of your feet, elbows close to the body, turn the rope with your wrists.', 'Petits sauts sur l’avant des pieds, coudes près du corps, la corde tourne avec les poignets.', 'قفزات صغيرة على مقدمة القدمين، المرفقان قرب الجسم، وأديري الحبل بالمعصمين.', 'نطات صغار على راس رجليك، الكيعان قراب للجسم، دوري الحبل بيديك.') },
  { id: 'stairs', emoji: '🪜', met: 8.8, impact: 'low', level: 2, name: L('Stair climbing (fast)', 'Monter les escaliers (rapide)', 'صعود الدرج بسرعة', 'طلوع الدروج بالزربة'),
    how: L('Climb stairs at a brisk pace, use the handrail if needed, walk down slowly to recover.', 'Montez à bon rythme, tenez la rampe si besoin, redescendez lentement pour récupérer.', 'اصعدي الدرج بخطى سريعة، استعيني بالدرابزين عند الحاجة، وانزلي ببطء للاستراحة.', 'طلعي الدروج بالزربة، شدي فالدرابوز إلا خاصك، وهبطي بشوية باش ترتاحي.') },
  { id: 'running', emoji: '🏃‍♀️', met: 8.3, impact: 'high', level: 2, name: L('Running (8 km/h)', 'Course (8 km/h)', 'الجري (8 كم/س)', 'الجري (8 كم/س)'),
    how: L('Easy jog where you can still say a few words. Start with 1 min running / 1 min walking.', 'Footing où vous pouvez encore parler. Commencez par 1 min de course / 1 min de marche.', 'جري خفيف تستطيعين فيه قول بعض الكلمات. ابدئي بدقيقة جري ودقيقة مشي.', 'جري خفيف تقدري فيه تهضري شوية. بداي بدقيقة جري ودقيقة مشي.') },
  { id: 'jumping_jacks', emoji: '🤸‍♀️', met: 8.0, impact: 'high', level: 2, name: L('Jumping jacks', 'Jumping jacks', 'القفز مع فتح اليدين والرجلين', 'جامپينگ جاكس'),
    how: L('Jump feet apart while raising arms overhead, then jump back together. Keep knees soft.', 'Sautez pieds écartés en levant les bras, puis revenez pieds joints. Genoux souples.', 'اقفزي مع فتح القدمين ورفع اليدين، ثم عودي. أبقي الركبتين مرنتين.', 'نطي وحلي رجليك وهزي يديك الفوق، ورجعي. خلي الركابي مرخيين.') },
  { id: 'burpees', emoji: '🔥', met: 8.0, impact: 'high', level: 3, name: L('Burpees', 'Burpees', 'بيربي', 'بيربي'),
    how: L('Squat, hands on the floor, step or jump feet back to a plank, return, stand up. Step instead of jumping to make it easier.', 'Accroupie, mains au sol, pieds en arrière en planche, retour, debout. Marchez au lieu de sauter pour simplifier.', 'انزلي القرفصاء، اليدان على الأرض، أرجعي القدمين لوضع اللوح ثم عودي وقفي. امشي بدل القفز لتسهيلها.', 'هبطي، يديك فالأرض، رجعي رجليك لور، رجعي ونوضي. مشي بلاصت النط إلا بغيتيها ساهلة.') },
  { id: 'high_knees', emoji: '🦵', met: 8.0, impact: 'high', level: 2, name: L('High knees', 'Montées de genoux', 'رفع الركبتين', 'هز الركابي'),
    how: L('Run in place lifting your knees to hip height, arms pumping.', 'Courez sur place en montant les genoux à hauteur des hanches, bras actifs.', 'اجري في مكانك مع رفع الركبتين إلى مستوى الورك وتحريك الذراعين.', 'جري فبلاصتك وهزي الركابي حتى للخصر وحركي يديك.') },
  { id: 'mountain_climbers', emoji: '⛰️', met: 8.0, impact: 'low', level: 2, name: L('Mountain climbers', 'Mountain climbers', 'متسلق الجبل', 'متسلق الجبل'),
    how: L('In a plank, bring one knee toward the chest, then switch quickly. Keep hips low.', 'En planche, amenez un genou vers la poitrine puis alternez vite. Hanches basses.', 'في وضع اللوح، قربي ركبة إلى الصدر ثم بدّلي بسرعة مع إبقاء الورك منخفضا.', 'فوضعية البلانش، جيبي ركبة للصدر وبدلي بالزربة. خلي الخصر لتحت.') },
  { id: 'dancing', emoji: '💃', met: 7.3, impact: 'low', level: 1, name: L('Dance (aerobic)', 'Danse (aérobic)', 'الرقص الهوائي', 'الشطيح'),
    how: L('Put on music you love and keep moving for the whole song. Arms up = more energy.', 'Mettez une musique que vous aimez et bougez toute la chanson. Bras en l’air = plus d’énergie.', 'شغلي موسيقى تحبينها وتحركي طوال الأغنية. رفع الذراعين يزيد الجهد.', 'شعلي شي غنية كتعجبك وشطحي الغنية كاملة. هزي يديك باش تحرقي كثر.') },
  { id: 'football', emoji: '⚽', met: 7.0, impact: 'high', level: 2, name: L('Football (casual)', 'Football (loisir)', 'كرة القدم (ترفيهي)', 'الكورة'),
    how: L('A friendly match with friends or family counts as a great workout.', 'Un match amical entre amis ou en famille est un excellent entraînement.', 'مباراة ودية مع الأصدقاء أو العائلة تمرين ممتاز.', 'ماتش مع الصحاب ولا العائلة تمرين زوين بزاف.') },
  { id: 'cycling', emoji: '🚴‍♀️', met: 6.8, impact: 'low', level: 2, name: L('Cycling (moderate)', 'Vélo (modéré)', 'ركوب الدراجة (متوسط)', 'البيكالة'),
    how: L('Steady pace on a bike or stationary bike, slightly out of breath.', 'Rythme régulier à vélo ou vélo d’appartement, légèrement essoufflée.', 'سرعة ثابتة على دراجة أو دراجة ثابتة مع لهاث خفيف.', 'سرعة وحدة فالبيكالة ولا البيكالة ديال الدار، تنهجي شوية.') },
  { id: 'swimming', emoji: '🏊‍♀️', met: 5.8, impact: 'low', level: 2, name: L('Swimming (moderate)', 'Natation (modérée)', 'السباحة (متوسط)', 'العوم'),
    how: L('Freestyle or breaststroke at a comfortable pace; rest at the wall when needed.', 'Crawl ou brasse à rythme confortable ; pause au bord si besoin.', 'سباحة حرة أو صدر بسرعة مريحة، واستريحي عند الحافة عند الحاجة.', 'عومي بسرعة مرتاحة، وارتاحي فالحافة إلا عييتي.') },
  { id: 'squats', emoji: '🍑', met: 5.0, impact: 'low', level: 1, name: L('Squats', 'Squats', 'القرفصاء', 'سكوات'),
    how: L('Feet hip-width apart, sit back as if on a chair, chest up, knees over toes, then stand.', 'Pieds largeur des hanches, asseyez-vous comme sur une chaise, buste droit, puis remontez.', 'القدمان بعرض الورك، انزلي كأنك تجلسين على كرسي مع رفع الصدر، ثم قفي.', 'رجليك قد الخصر، هبطي بحال إلا غادي تگلسي فكرسي، الصدر لفوق، ونوضي.') },
  { id: 'brisk_walk', emoji: '🚶‍♀️', met: 4.3, impact: 'low', level: 1, name: L('Brisk walking (5.6 km/h)', 'Marche rapide (5,6 km/h)', 'المشي السريع (5.6 كم/س)', 'التمشية بالزربة'),
    how: L('Walk fast enough that talking is possible but singing is hard. Swing your arms.', 'Marchez assez vite pour pouvoir parler mais pas chanter. Balancez les bras.', 'امشي بسرعة تسمح بالكلام لا بالغناء، وحركي ذراعيك.', 'تمشاي بالزربة، تقدري تهضري ولكن ما تقدريش تغني. حركي يديك.') },
  { id: 'pushups', emoji: '💪', met: 3.8, impact: 'low', level: 2, name: L('Push-ups', 'Pompes', 'تمارين الضغط', 'البومپات'),
    how: L('Hands under shoulders, body straight, lower chest toward the floor and push up. Start on knees or against a wall.', 'Mains sous les épaules, corps droit, descendez la poitrine puis poussez. Commencez sur les genoux ou au mur.', 'اليدان تحت الكتفين والجسم مستقيم، أنزلي الصدر ثم ادفعي. ابدئي على الركبتين أو على الحائط.', 'يديك تحت كتافك، الجسم مستقيم، هبطي الصدر ودفعي. بداي على الركابي ولا فالحيط.') },
  { id: 'lunges', emoji: '🦿', met: 3.8, impact: 'low', level: 2, name: L('Lunges', 'Fentes', 'الطعنات (لانجز)', 'لانجز'),
    how: L('Step forward, lower until both knees are about 90°, push back. Alternate legs.', 'Un pas en avant, descendez jusqu’à 90° aux genoux, revenez. Alternez.', 'خطوة للأمام، انزلي حتى تصبح الركبتان بزاوية 90° تقريبا، ثم عودي وبدّلي.', 'خطوة لقدام، هبطي حتى الركابي يوليو 90°، رجعي وبدلي الرجل.') },
  { id: 'plank', emoji: '🧱', met: 3.8, impact: 'low', level: 1, name: L('Plank', 'Gainage (planche)', 'اللوح (بلانك)', 'البلانش'),
    how: L('Forearms on the floor, body in a straight line, belly tight. Breathe normally.', 'Avant-bras au sol, corps aligné, ventre serré. Respirez normalement.', 'الساعدان على الأرض، الجسم مستقيم والبطن مشدود، وتنفسي بشكل عادي.', 'الذراع فالأرض، الجسم مستقيم، شدي الكرش وتنفسي عادي.') },
  { id: 'glute_bridge', emoji: '🌉', met: 3.8, impact: 'low', level: 1, name: L('Glute bridge', 'Pont fessier', 'جسر المؤخرة', 'البونت'),
    how: L('Lie on your back, knees bent, lift hips until body is straight from knees to shoulders, lower slowly.', 'Sur le dos, genoux pliés, montez le bassin jusqu’à l’alignement genoux-épaules, redescendez lentement.', 'استلقي على ظهرك والركبتان مثنيتان، ارفعي الورك حتى يستقيم الجسم ثم انزلي ببطء.', 'تمددي على ظهرك، الركابي مطويين، هزي الخصر حتى يولي الجسم مستقيم، وهبطي بشوية.') },
  { id: 'march', emoji: '🥁', met: 3.5, impact: 'low', level: 1, name: L('Marching in place', 'Marche sur place', 'المشي في المكان', 'المشي فبلاصتك'),
    how: L('March on the spot, lifting knees and swinging arms. Great warm-up and knee-friendly.', 'Marchez sur place en levant les genoux et balançant les bras. Idéal en échauffement.', 'امشي في مكانك مع رفع الركبتين وتحريك الذراعين. ممتاز للإحماء.', 'تمشاي فبلاصتك وهزي الركابي وحركي يديك. مزيان للتسخين.') },
  { id: 'yoga', emoji: '🧘‍♀️', met: 2.5, impact: 'low', level: 1, name: L('Yoga / stretching', 'Yoga / étirements', 'اليوغا / التمدد', 'اليوگا / التمطيط'),
    how: L('Slow poses and stretches, breathing deeply. Good for recovery and stress.', 'Postures lentes et étirements avec respiration profonde. Bon pour récupérer et pour le stress.', 'وضعيات بطيئة وتمدد مع تنفس عميق، مفيد للتعافي والتوتر.', 'وضعيات بشوية وتمطيط مع تنفس عميق، مزيان للراحة والستريس.') },
];
export const REST_MET = 1.5;
export const getExercise = (id: string) => EXERCISES.find(e => e.id === id);

export interface Workout { id: string; emoji: string; name: T; desc: T; level: 1 | 2 | 3; impact: 'low' | 'high'; blocks: { ex: string | 'rest'; sec: number }[] }
const rounds = (n: number, list: [string, number][]) => Array.from({ length: n }, () => list.map(([ex, sec]) => ({ ex, sec }))).flat();
export const WORKOUTS: Workout[] = [
  { id: 'hiit15', emoji: '🔥', level: 2, impact: 'high', name: L('Fat-burn HIIT · 14 min', 'HIIT brûle-graisses · 14 min', 'تمرين HIIT لحرق الدهون · 14 د', 'HIIT باش تحرقي · 14 د'),
    desc: L('40 s effort / 20 s rest, 3 rounds. Short and intense.', '40 s d’effort / 20 s de repos, 3 tours. Court et intense.', '40 ثانية جهد / 20 ثانية راحة، 3 جولات. قصير ومكثف.', '40 ثانية خدمة / 20 راحة، 3 دورات. قصير وقوي.'),
    blocks: [{ ex: 'march', sec: 60 }, ...rounds(3, [['jumping_jacks', 40], ['rest', 20], ['squats', 40], ['rest', 20], ['mountain_climbers', 40], ['rest', 20], ['high_knees', 40], ['rest', 20]]), { ex: 'yoga', sec: 60 }] },
  { id: 'strength17', emoji: '💪', level: 2, impact: 'low', name: L('Home strength · 17 min', 'Renforcement maison · 17 min', 'تقوية في المنزل · 17 د', 'تقوية فالدار · 17 د'),
    desc: L('No equipment. Builds muscle, which helps burn more every day.', 'Sans matériel. Renforce les muscles, qui brûlent plus chaque jour.', 'بدون أدوات. يقوي العضلات التي تحرق أكثر كل يوم.', 'بلا ماتيريال. كيقوي العضلات اللي كيحرقو كثر كل نهار.'),
    blocks: [{ ex: 'march', sec: 60 }, ...rounds(3, [['squats', 45], ['rest', 15], ['pushups', 45], ['rest', 15], ['lunges', 45], ['rest', 15], ['glute_bridge', 45], ['rest', 15], ['plank', 30], ['rest', 30]]), { ex: 'yoga', sec: 60 }] },
  { id: 'lowimpact15', emoji: '🌸', level: 1, impact: 'low', name: L('Low-impact cardio · 15 min', 'Cardio doux · 15 min', 'كارديو خفيف · 15 د', 'كارديو خفيف · 15 د'),
    desc: L('No jumping — kind to knees, good for beginners.', 'Sans sauts — doux pour les genoux, idéal pour débuter.', 'بدون قفز، لطيف على الركبتين ومناسب للمبتدئات.', 'بلا نط، مزيان للركابي وللي باقة كتبدا.'),
    blocks: [{ ex: 'march', sec: 60 }, ...rounds(4, [['march', 60], ['squats', 40], ['rest', 20], ['dancing', 60], ['glute_bridge', 40], ['rest', 20]]), { ex: 'yoga', sec: 120 }] },
  { id: 'rope10', emoji: '🪢', level: 3, impact: 'high', name: L('Jump-rope challenge · 11 min', 'Défi corde à sauter · 11 min', 'تحدي نط الحبل · 11 د', 'تحدي الحبل · 11 د'),
    desc: L('One of the biggest calorie burners per minute.', 'L’un des exercices qui brûlent le plus par minute.', 'من أكثر التمارين حرقا للسعرات في الدقيقة.', 'من أكثر التمارين اللي كيحرقو فالدقيقة.'),
    blocks: [{ ex: 'march', sec: 60 }, ...rounds(5, [['jump_rope', 60], ['rest', 60]])] },
  { id: 'dance20', emoji: '💃', level: 1, impact: 'low', name: L('Dance party · 20 min', 'Danse · 20 min', 'حفلة رقص · 20 د', 'شطيح · 20 د'),
    desc: L('Fun cardio: put on your favourite songs.', 'Cardio fun : mettez vos chansons préférées.', 'كارديو ممتع: شغلي أغانيك المفضلة.', 'كارديو زوين: شعلي الغنايا اللي كتعجبك.'),
    blocks: [{ ex: 'march', sec: 120 }, { ex: 'dancing', sec: 960 }, { ex: 'yoga', sec: 120 }] },
];
export const getWorkout = (id: string) => WORKOUTS.find(w => w.id === id);

export const TIPS: { emoji: string; title: T; text: T }[] = [
  { emoji: '🚶‍♀️', title: L('Walk 10 minutes after meals', 'Marchez 10 min après les repas', 'امشي 10 دقائق بعد الأكل', 'تمشاي 10 دقايق من بعد الماكلة'),
    text: L('A short walk after lunch and dinner adds up to 20+ minutes a day and helps digestion.', 'Une courte marche après le déjeuner et le dîner fait plus de 20 min par jour et aide la digestion.', 'مشي قصير بعد الغداء والعشاء يضيف أكثر من 20 دقيقة يوميا ويساعد الهضم.', 'تمشية صغيرة من بعد الغدا والعشا كتجمع 20 دقيقة فالنهار وكتعاون فالهضم.') },
  { emoji: '🪜', title: L('Take the stairs', 'Prenez les escaliers', 'استعملي الدرج', 'طلعي فالدروج'),
    text: L('Stairs burn about twice as much as walking on flat ground. Skip the lift for a few floors.', 'Les escaliers brûlent environ deux fois plus que la marche à plat. Évitez l’ascenseur pour quelques étages.', 'الدرج يحرق تقريبا ضعف المشي العادي. تجنبي المصعد لبضعة طوابق.', 'الدروج كيحرقو تقريبا جوج مرات كثر من المشي. خلي السانسور لبعض الطوابق.') },
  { emoji: '💪', title: L('Add strength twice a week', 'Renforcement 2 fois par semaine', 'تمارين القوة مرتين أسبوعيا', 'التقوية جوج مرات فالسيمانة'),
    text: L('More muscle means your body uses more energy even at rest. Squats, push-ups and bridges are enough to start.', 'Plus de muscle = plus d’énergie dépensée même au repos. Squats, pompes et pont suffisent pour commencer.', 'العضلات الأكثر تعني حرق طاقة أكثر حتى في الراحة. القرفصاء والضغط والجسر تكفي للبداية.', 'العضلات كتخلي الجسم يحرق كثر حتى وانتي مرتاحة. سكوات، بومپات والبونت كافيين باش تبداي.') },
  { emoji: '⏱️', title: L('Short intervals work', 'Les intervalles courts marchent', 'الفترات القصيرة فعالة', 'التمارين القصيرة كتنفع'),
    text: L('Alternating 30–40 s of effort with rest (HIIT) burns a lot in little time. 2–3 times a week is plenty.', 'Alterner 30–40 s d’effort et du repos (HIIT) brûle beaucoup en peu de temps. 2–3 fois par semaine suffisent.', 'تبديل 30-40 ثانية جهد مع راحة (HIIT) يحرق كثيرا في وقت قصير. 2-3 مرات أسبوعيا تكفي.', 'تبدلي 30-40 ثانية خدمة مع الراحة (HIIT) كيحرق بزاف فوقت قليل. 2-3 مرات فالسيمانة كافيين.') },
  { emoji: '🧹', title: L('Move more during the day', 'Bougez plus dans la journée', 'تحركي أكثر خلال اليوم', 'تحركي كثر فالنهار'),
    text: L('Housework, standing up every hour, walking to the hanout: everyday movement can burn more than a workout.', 'Ménage, se lever chaque heure, marcher jusqu’à l’épicerie : le mouvement quotidien peut brûler plus qu’une séance.', 'أعمال المنزل، القيام كل ساعة، المشي إلى الحانوت: الحركة اليومية قد تحرق أكثر من حصة رياضة.', 'شغل الدار، نوضي كل ساعة، تمشاي للحانوت: الحركة ديال النهار تقدر تحرق كثر من حصة رياضة.') },
  { emoji: '📅', title: L('Consistency beats intensity', 'La régularité avant l’intensité', 'الانتظام أهم من الشدة', 'الاستمرار أحسن من القوة'),
    text: L('20 minutes most days is better than one exhausting session a week. Choose what you enjoy.', '20 minutes presque tous les jours valent mieux qu’une séance épuisante par semaine. Choisissez ce que vous aimez.', '20 دقيقة معظم الأيام أفضل من حصة مرهقة مرة أسبوعيا. اختاري ما تحبين.', '20 دقيقة تقريبا كل نهار أحسن من حصة وحدة كتعيي فالسيمانة. ختاري اللي كيعجبك.') },
  { emoji: '💧', title: L('Drink and warm up', 'Buvez et échauffez-vous', 'اشربي وسخّني', 'شربي وسخني'),
    text: L('Drink water before and after, warm up 1–2 minutes, and stretch at the end.', 'Buvez avant et après, échauffez-vous 1–2 minutes et étirez-vous à la fin.', 'اشربي الماء قبل وبعد، سخّني دقيقة أو دقيقتين، وتمددي في النهاية.', 'شربي الما قبل ومن بعد، سخني دقيقة ولا جوج، وتمططي فاللخر.') },
  { emoji: '😴', title: L('Sleep and protein help', 'Sommeil et protéines aident', 'النوم والبروتين يساعدان', 'النعاس والبروتين كيعاونو'),
    text: L('Good sleep and enough protein (eggs, lentils, sardines, yogurt) help muscles recover.', 'Un bon sommeil et assez de protéines (œufs, lentilles, sardines, yaourt) aident à récupérer.', 'النوم الجيد والبروتين الكافي (بيض، عدس، سردين، ياغورت) يساعدان العضلات على التعافي.', 'النعاس المزيان والبروتين (البيض، العدس، السردين، الياغورت) كيعاونو العضلات ترتاح.') },
  { emoji: '💗', title: L('Exercise is not a punishment', 'Le sport n’est pas une punition', 'الرياضة ليست عقابا', 'الرياضة ماشي عقاب'),
    text: L('Move because it feels good and makes you strong — never to “pay” for what you ate.', 'Bougez parce que ça fait du bien et rend forte — jamais pour « payer » ce que vous avez mangé.', 'تحركي لأن ذلك يشعرك بالراحة والقوة، وليس لتعويض ما أكلت.', 'تحركي حيت كيفرحك وكيقويك، ماشي باش تخلصي على داكشي اللي كليتي.') },
  { emoji: '🩺', title: L('Listen to your body', 'Écoutez votre corps', 'استمعي لجسمك', 'سمعي لجسمك'),
    text: L('Stop if you feel chest pain, dizziness or sharp pain. If you are pregnant, have a health condition or haven’t exercised in a long time, ask a doctor first.', 'Arrêtez en cas de douleur thoracique, vertige ou douleur vive. Enceinte, malade ou sédentaire depuis longtemps : demandez d’abord à un médecin.', 'توقفي عند ألم الصدر أو الدوخة أو ألم حاد. إن كنت حاملا أو لديك حالة صحية أو لم تمارسي الرياضة منذ مدة، استشيري طبيبا أولا.', 'وقفي إلا حسيتي بوجع فالصدر، دوخة ولا وجع قوي. إلا كنتي حاملة، مريضة ولا شحال ما درتي رياضة، سولي الطبيب قبل.') },
];
