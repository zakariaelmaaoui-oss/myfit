"""Build src/data/foods.json from the official USDA FoodData Central SR Legacy CSV dataset.

Usage:
  curl -L -o sr.zip https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
  unzip sr.zip
  python3 scripts/build_foods.py <path-to-unzipped-folder> src/data/foods.json

Every nutrient value comes straight from the dataset (per 100 g edible portion).
Nothing is estimated here. "Added sugar" is NOT part of SR Legacy, so it is set only by a
documented rule (see ADDED_RULES); otherwise it is null (= unknown) and shown as unknown in the app.
"""
import csv, json, sys, os

# key, fdc_id, category, en, fr, ar, added_sugar_rule
# added_sugar_rule: "zero"  -> single unprocessed food with no sugar added (0 g by definition)
#                   "all"   -> the food IS a sugar / sweetener or a drink sweetened only with sugar (added = total)
#                   None    -> unknown (shown as "unknown" in the app)
FOODS = [
 # Vegetables
 ("potato_boiled", 170440, "vegetables", "Potatoes, boiled (no skin)", "Pommes de terre bouillies (sans peau)", "بطاطس مسلوقة (بدون قشرة)", "zero"),
 ("potato_raw", 170026, "vegetables", "Potatoes, raw", "Pommes de terre crues", "بطاطس نيئة", "zero"),
 ("tomato", 170457, "vegetables", "Tomatoes, raw", "Tomates crues", "طماطم نيئة", "zero"),
 ("onion", 170000, "vegetables", "Onions, raw", "Oignons crus", "بصل نيء", "zero"),
 ("carrot", 170393, "vegetables", "Carrots, raw", "Carottes crues", "جزر نيء", "zero"),
 ("carrot_boiled", 170394, "vegetables", "Carrots, boiled", "Carottes bouillies", "جزر مسلوق", "zero"),
 ("zucchini", 169291, "vegetables", "Zucchini, raw", "Courgettes crues", "كوسة نيئة", "zero"),
 ("eggplant", 169228, "vegetables", "Eggplant, raw", "Aubergine crue", "باذنجان نيء", "zero"),
 ("pepper_green", 170427, "vegetables", "Green bell pepper, raw", "Poivron vert cru", "فلفل أخضر حلو", "zero"),
 ("pepper_red", 170108, "vegetables", "Red bell pepper, raw", "Poivron rouge cru", "فلفل أحمر حلو", "zero"),
 ("chili_green", 170497, "vegetables", "Hot green chili, raw", "Piment vert", "فلفل حار أخضر", "zero"),
 ("cucumber", 168409, "vegetables", "Cucumber with peel, raw", "Concombre avec peau", "خيار بقشرته", "zero"),
 ("lettuce", 169247, "vegetables", "Lettuce, romaine, raw", "Laitue romaine", "خس", "zero"),
 ("spinach", 168462, "vegetables", "Spinach, raw", "Épinards crus", "سبانخ نيئة", "zero"),
 ("cabbage", 169975, "vegetables", "Cabbage, raw", "Chou cru", "كرنب (ملفوف)", "zero"),
 ("cauliflower", 169986, "vegetables", "Cauliflower, raw", "Chou-fleur cru", "قرنبيط", "zero"),
 ("broccoli", 170379, "vegetables", "Broccoli, raw", "Brocoli cru", "بروكلي", "zero"),
 ("garlic", 169230, "vegetables", "Garlic, raw", "Ail cru", "ثوم", "zero"),
 ("peas_green", 170419, "vegetables", "Green peas, raw", "Petits pois crus", "جلبانة (بازلاء)", "zero"),
 ("green_beans", 169961, "vegetables", "Green beans, raw", "Haricots verts crus", "لوبيا خضراء", "zero"),
 ("turnip", 170465, "vegetables", "Turnips, raw", "Navets crus", "لفت", "zero"),
 ("beet", 169145, "vegetables", "Beets, raw", "Betterave crue", "شمندر (باربا)", "zero"),
 ("pumpkin", 168448, "vegetables", "Pumpkin, raw", "Potiron cru", "قرع (كرعة حمراء)", "zero"),
 ("sweet_potato", 168482, "vegetables", "Sweet potato, raw", "Patate douce crue", "بطاطا حلوة", "zero"),
 ("okra", 169260, "vegetables", "Okra, raw", "Gombo cru", "ملوخية (بامية)", "zero"),
 ("artichoke", 169205, "vegetables", "Artichoke, raw", "Artichaut cru", "خرشوف (قوق)", "zero"),
 ("parsley", 170416, "vegetables", "Parsley, fresh", "Persil frais", "معدنوس", "zero"),
 ("coriander", 169997, "vegetables", "Coriander leaves, fresh", "Coriandre fraîche", "قزبور", "zero"),
 ("mint", 173475, "vegetables", "Spearmint, fresh", "Menthe fraîche", "نعناع", "zero"),
 ("mushroom", 169251, "vegetables", "Mushrooms, white, raw", "Champignons de Paris crus", "فطر أبيض", "zero"),
 ("celery", 169988, "vegetables", "Celery, raw", "Céleri cru", "كرافس", "zero"),
 ("leek", 169246, "vegetables", "Leeks, raw", "Poireaux crus", "كراث (بوارو)", "zero"),
 ("corn_sweet", 169998, "vegetables", "Sweet corn, raw", "Maïs doux cru", "ذرة حلوة", "zero"),
 ("olives_black", 169094, "vegetables", "Olives, ripe (black), canned", "Olives noires en conserve", "زيتون أسود", None),
 ("olives_green", 169096, "vegetables", "Olives, green, pickled", "Olives vertes", "زيتون أخضر", None),
 ("lemon", 167746, "fruits", "Lemon, raw (no peel)", "Citron cru (sans peau)", "حامض (ليمون)", "zero"),
 ("lemon_juice", 167747, "drinks", "Lemon juice, raw", "Jus de citron frais", "عصير الحامض", "zero"),
 ("ginger", 169231, "vegetables", "Ginger root, raw", "Gingembre frais", "سكنجبير طري", "zero"),
 ("tomato_paste", 170459, "packaged", "Tomato paste, canned, no salt added", "Concentré de tomates sans sel ajouté", "معجون الطماطم", None),
 # Fruits
 ("apple", 171688, "fruits", "Apple, raw, with skin", "Pomme crue avec peau", "تفاح", "zero"),
 ("banana", 173944, "fruits", "Banana, raw", "Banane crue", "موز", "zero"),
 ("orange", 169097, "fruits", "Orange, raw", "Orange crue", "برتقال (ليمون)", "zero"),
 ("tangerine", 169105, "fruits", "Mandarin / clementine, raw", "Mandarine / clémentine", "مندرين", "zero"),
 ("grapes", 174683, "fruits", "Grapes, raw", "Raisins frais", "عنب", "zero"),
 ("strawberry", 167762, "fruits", "Strawberries, raw", "Fraises crues", "فراولة (توت)", "zero"),
 ("watermelon", 167765, "fruits", "Watermelon, raw", "Pastèque", "دلاح", "zero"),
 ("melon", 169092, "fruits", "Melon (cantaloupe), raw", "Melon", "بطيخ", "zero"),
 ("pear", 169118, "fruits", "Pear, raw", "Poire crue", "إجاص (بوعويد)", "zero"),
 ("peach", 169928, "fruits", "Peach, raw", "Pêche crue", "خوخ", "zero"),
 ("apricot", 171697, "fruits", "Apricot, raw", "Abricot cru", "مشمش", "zero"),
 ("fig", 173021, "fruits", "Figs, raw", "Figues fraîches", "كرموس", "zero"),
 ("fig_dried", 174665, "fruits", "Figs, dried", "Figues sèches", "شريحة (كرموس يابس)", "zero"),
 ("dates_medjool", 168191, "fruits", "Dates, medjool", "Dattes medjool", "تمر المجهول", "zero"),
 ("dates_deglet", 171726, "fruits", "Dates, deglet noor", "Dattes deglet nour", "تمر دقلة نور", "zero"),
 ("pomegranate", 169134, "fruits", "Pomegranate, raw", "Grenade", "رمان", "zero"),
 ("avocado", 171705, "fruits", "Avocado, raw", "Avocat", "أفوكادو (لافوكا)", "zero"),
 ("prickly_pear", 167750, "fruits", "Prickly pear, raw", "Figue de Barbarie", "هندية (كرموس النصارى)", "zero"),
 ("plum", 169949, "fruits", "Plum, raw", "Prune fraîche", "برقوق", "zero"),
 ("cherry", 171719, "fruits", "Cherries, sweet, raw", "Cerises", "حب الملوك", "zero"),
 ("kiwi", 168153, "fruits", "Kiwi, raw", "Kiwi", "كيوي", "zero"),
 ("mango", 169910, "fruits", "Mango, raw", "Mangue", "مانجو", "zero"),
 ("pineapple", 169124, "fruits", "Pineapple, raw", "Ananas", "أناناس", "zero"),
 ("raisins", 168165, "fruits", "Raisins, seedless", "Raisins secs", "زبيب", "zero"),
 ("prunes", 168162, "fruits", "Prunes (dried plums)", "Pruneaux", "برقوق مجفف", "zero"),
 ("apricot_dried", 173941, "fruits", "Apricots, dried", "Abricots secs", "مشمش مجفف", None),
 # Chicken & poultry
 ("chicken_breast_raw", 171077, "chicken", "Chicken breast, skinless, raw", "Blanc de poulet sans peau, cru", "صدر دجاج بدون جلد، نيء", "zero"),
 ("chicken_breast_roasted", 171477, "chicken", "Chicken breast, roasted", "Blanc de poulet rôti", "صدر دجاج مشوي", "zero"),
 ("chicken_thigh_raw", 173627, "chicken", "Chicken thigh, meat only, raw", "Cuisse de poulet sans peau, crue", "فخذ دجاج بدون جلد، نيء", "zero"),
 ("chicken_thigh_roasted", 172388, "chicken", "Chicken thigh, meat only, roasted", "Cuisse de poulet rôtie", "فخذ دجاج مشوي", "zero"),
 ("chicken_leg_skin_raw", 172378, "chicken", "Chicken leg with skin, raw", "Cuisse de poulet avec peau, crue", "رجل دجاج بالجلد، نيئة", "zero"),
 ("turkey_breast_raw", 171098, "chicken", "Turkey breast, raw", "Blanc de dinde cru", "صدر ديك رومي نيء", "zero"),
 # Meat
 ("beef_ground_85", 171796, "meat", "Ground beef 85% lean, raw", "Bœuf haché 15% MG, cru", "لحم بقري مفروم 15% دهون", "zero"),
 ("beef_ground_90", 174030, "meat", "Ground beef 90% lean, raw", "Bœuf haché 10% MG, cru", "لحم بقري مفروم 10% دهون", "zero"),
 ("beef_chuck_lean", 169445, "meat", "Beef chuck (stewing), lean, raw", "Bœuf à braiser (paleron), maigre, cru", "لحم بقري للطهي (طاجين)، نيء", "zero"),
 ("beef_round_lean", 171757, "meat", "Beef top round, lean, raw", "Bœuf tende de tranche, maigre, cru", "لحم بقري هبرة، نيء", "zero"),
 ("lamb_ground", 174370, "meat", "Lamb, ground, raw", "Agneau haché, cru", "لحم غنمي مفروم، نيء", "zero"),
 ("beef_liver", 169451, "meat", "Beef liver, raw", "Foie de bœuf, cru", "كبدة بقري", "zero"),
 ("lamb_liver", 172531, "meat", "Lamb liver, raw", "Foie d'agneau, cru", "كبدة غنمي", "zero"),
 # Fish
 ("sardine_canned_oil", 175139, "fish", "Sardines, canned in oil, drained", "Sardines à l'huile, égouttées", "سردين معلب بالزيت", "zero"),
 ("sardine_canned_tomato", 175140, "fish", "Sardines in tomato sauce, canned", "Sardines à la sauce tomate", "سردين بصلصة الطماطم", None),
 ("tuna_water", 173709, "fish", "Tuna, light, canned in water", "Thon au naturel", "تون بالماء", "zero"),
 ("tuna_oil", 173708, "fish", "Tuna, light, canned in oil", "Thon à l'huile", "تون بالزيت", "zero"),
 ("salmon_raw", 175167, "fish", "Salmon, Atlantic farmed, raw", "Saumon d'élevage, cru", "سلمون نيء", "zero"),
 ("cod_raw", 171955, "fish", "Cod, raw", "Cabillaud cru", "سمك القد نيء", "zero"),
 ("mackerel_raw", 175119, "fish", "Mackerel, raw", "Maquereau cru", "إسقمري (كابايلا)", "zero"),
 ("anchovy_raw", 174182, "fish", "Anchovy, raw", "Anchois cru", "أنشوبة (شطون)", "zero"),
 ("whiting_raw", 173713, "fish", "Whiting (merlan), raw", "Merlan cru", "ميرلان نيء", "zero"),
 ("sea_bass_raw", 175142, "fish", "Sea bass, raw", "Bar (loup) cru", "قاروص (لوب)", "zero"),
 ("shrimp_raw", 175179, "fish", "Shrimp, raw", "Crevettes crues", "قمرون (كروفيت)", "zero"),
 ("squid_raw", 174223, "fish", "Squid, raw", "Calamar cru", "كلامار", "zero"),
 # Eggs
 ("egg", 171287, "eggs", "Egg, whole, raw", "Œuf entier cru", "بيض كامل نيء", "zero"),
 ("egg_boiled", 173424, "eggs", "Egg, hard-boiled", "Œuf dur", "بيض مسلوق", "zero"),
 ("egg_fried", 173423, "eggs", "Egg, fried", "Œuf au plat", "بيض مقلي", "zero"),
 ("egg_scrambled", 172187, "eggs", "Egg, scrambled", "Œufs brouillés", "بيض مخفوق مطبوخ", None),
 ("egg_white", 172183, "eggs", "Egg white, raw", "Blanc d'œuf cru", "بياض البيض", "zero"),
 # Dairy
 ("milk_whole", 171265, "dairy", "Milk, whole 3.25%", "Lait entier", "حليب كامل الدسم", "zero"),
 ("milk_semi", 171267, "dairy", "Milk, reduced fat 2%", "Lait demi-écrémé (2%)", "حليب نصف دسم", "zero"),
 ("milk_low", 170872, "dairy", "Milk, low fat 1%", "Lait écrémé 1%", "حليب قليل الدسم", "zero"),
 ("yogurt_plain_whole", 171284, "dairy", "Yogurt, plain, whole milk", "Yaourt nature entier", "ياغورت طبيعي كامل الدسم", "zero"),
 ("yogurt_plain_low", 170886, "dairy", "Yogurt, plain, low fat", "Yaourt nature allégé", "ياغورت طبيعي قليل الدسم", "zero"),
 ("greek_yogurt_nonfat", 170894, "dairy", "Greek yogurt, plain, nonfat", "Yaourt grec nature 0%", "ياغورت يوناني 0%", "zero"),
 ("buttermilk", 170874, "dairy", "Buttermilk (lben), low fat", "Lben (babeurre) allégé", "لبن (مخيض)", "zero"),
 ("cheese_feta", 173420, "dairy", "Feta cheese", "Fromage feta", "جبن فيتا", "zero"),
 ("cheese_mozzarella", 170845, "dairy", "Mozzarella, whole milk", "Mozzarella", "موزاريلا", "zero"),
 ("cheese_cheddar", 170899, "dairy", "Cheddar cheese", "Cheddar", "جبن شيدر", "zero"),
 ("cheese_gouda", 171241, "dairy", "Gouda / edam-type cheese", "Gouda", "جبن كودا (جبن أحمر)", "zero"),
 ("cheese_cottage", 172182, "dairy", "Cottage cheese, 2% fat", "Fromage cottage 2%", "جبن قريش", "zero"),
 ("cheese_cream", 173418, "dairy", "Cream cheese", "Fromage à la crème", "جبن كريمي", None),
 ("cheese_processed", 171290, "packaged", "Processed cheese (portions)", "Fromage fondu (portions)", "جبن مطبوخ (فرماج)", None),
 ("butter", 173410, "oils", "Butter, salted", "Beurre salé", "زبدة", "zero"),
 ("cream_heavy", 170859, "dairy", "Cream, heavy whipping", "Crème liquide entière", "كريمة طرية", "zero"),
 # Cereals & bread
 ("rice_white_raw", 168877, "cereals", "White rice, raw", "Riz blanc cru", "أرز أبيض نيء", "zero"),
 ("rice_white_cooked", 168878, "cereals", "White rice, cooked", "Riz blanc cuit", "أرز أبيض مطبوخ", "zero"),
 ("rice_brown_cooked", 169704, "cereals", "Brown rice, cooked", "Riz complet cuit", "أرز بني مطبوخ", "zero"),
 ("couscous_dry", 169699, "cereals", "Couscous, dry", "Couscous sec", "كسكس جاف", "zero"),
 ("couscous_cooked", 169700, "cereals", "Couscous, cooked", "Couscous cuit", "كسكس مطبوخ", "zero"),
 ("flour_white", 168894, "cereals", "Wheat flour, white", "Farine blanche", "دقيق أبيض (فارينة)", "zero"),
 ("flour_whole", 168893, "cereals", "Wheat flour, whole grain", "Farine complète", "دقيق كامل", "zero"),
 ("semolina", 169715, "cereals", "Semolina (durum)", "Semoule de blé dur", "سميد", "zero"),
 ("barley_flour", 169739, "cereals", "Barley flour", "Farine d'orge", "دقيق الشعير (تومزين)", "zero"),
 ("oats", 173904, "cereals", "Oats, rolled, dry", "Flocons d'avoine", "شوفان", "zero"),
 ("pasta_dry", 169736, "cereals", "Pasta, dry", "Pâtes sèches", "معكرونة جافة", "zero"),
 ("pasta_cooked", 169737, "cereals", "Pasta, cooked", "Pâtes cuites", "معكرونة مطبوخة", "zero"),
 ("vermicelli_dry", 169731, "cereals", "Noodles / vermicelli, dry", "Vermicelles / nouilles sèches", "شعرية جافة", "zero"),
 ("barley_pearled_cooked", 170285, "cereals", "Barley, pearled, cooked", "Orge perlé cuit", "شعير مطبوخ", "zero"),
 ("bulgur_cooked", 170287, "cereals", "Bulgur, cooked", "Boulgour cuit", "برغل مطبوخ", "zero"),
 ("wheat_bran", 169722, "cereals", "Wheat bran", "Son de blé", "نخالة القمح", "zero"),
 ("bread_white", 172675, "bread", "Bread, white baguette / french", "Pain blanc (baguette)", "خبز أبيض (كوميرا)", None),
 ("bread_whole", 172688, "bread", "Bread, whole-wheat", "Pain complet", "خبز كامل", None),
 ("bread_pita", 172816, "bread", "Pita bread, white", "Pain pita", "خبز البيتا", None),
 ("cornflakes", 174648, "packaged", "Corn flakes cereal", "Céréales corn flakes", "كورن فليكس", None),
 ("cheerios", 173884, "packaged", "Toasted oat ring cereal", "Céréales anneaux d'avoine", "حبوب الشوفان المحمصة", None),
 ("granola", 171646, "cereals", "Granola, homemade", "Granola maison", "غرانولا منزلية", None),
 ("crackers", 174982, "packaged", "Crackers, snack type", "Crackers apéritif", "كراكرز", None),
 # Legumes
 ("lentils_raw", 172420, "legumes", "Lentils, dry (raw)", "Lentilles sèches", "عدس جاف", "zero"),
 ("lentils_cooked", 172421, "legumes", "Lentils, cooked", "Lentilles cuites", "عدس مطبوخ", "zero"),
 ("chickpeas_raw", 173756, "legumes", "Chickpeas, dry (raw)", "Pois chiches secs", "حمص جاف", "zero"),
 ("chickpeas_cooked", 173757, "legumes", "Chickpeas, cooked", "Pois chiches cuits", "حمص مطبوخ", "zero"),
 ("kidney_beans_raw", 173744, "legumes", "Red kidney beans, dry (raw)", "Haricots rouges secs", "لوبيا حمراء جافة", "zero"),
 ("white_beans_raw", 175202, "legumes", "White beans, dry (raw)", "Haricots blancs secs", "لوبيا بيضاء جافة", "zero"),
 ("white_beans_cooked", 175203, "legumes", "White beans, cooked", "Haricots blancs cuits", "لوبيا بيضاء مطبوخة", "zero"),
 ("fava_raw", 175205, "legumes", "Fava beans, dry (raw)", "Fèves sèches", "فول يابس", "zero"),
 ("fava_cooked", 173753, "legumes", "Fava beans, cooked", "Fèves cuites", "فول مطبوخ", "zero"),
 ("split_peas_cooked", 172429, "legumes", "Split peas, cooked", "Pois cassés cuits", "جلبانة مقشرة مطبوخة", "zero"),
 ("hummus", 174289, "legumes", "Hummus, commercial", "Houmous du commerce", "حمص بالطحينة (تجاري)", None),
 ("tofu", 172475, "legumes", "Tofu, firm", "Tofu ferme", "توفو", "zero"),
 # Nuts & seeds
 ("almonds", 170567, "nuts", "Almonds", "Amandes", "لوز", "zero"),
 ("walnuts", 170187, "nuts", "Walnuts", "Noix", "كركاع", "zero"),
 ("peanuts", 172430, "nuts", "Peanuts, raw", "Cacahuètes crues", "كاوكاو", "zero"),
 ("peanuts_roasted", 173806, "nuts", "Peanuts, dry-roasted, unsalted", "Cacahuètes grillées sans sel", "كاوكاو محمص", "zero"),
 ("cashews", 170162, "nuts", "Cashews, raw", "Noix de cajou", "كاجو", "zero"),
 ("pistachios", 170184, "nuts", "Pistachios, raw", "Pistaches", "فستق", "zero"),
 ("sesame", 170150, "nuts", "Sesame seeds", "Graines de sésame", "جنجلان (سمسم)", "zero"),
 ("sunflower_seeds", 170562, "nuts", "Sunflower seeds", "Graines de tournesol", "زريعة الشمس", "zero"),
 ("chia", 170554, "nuts", "Chia seeds", "Graines de chia", "بذور الشيا", "zero"),
 ("flaxseed", 169414, "nuts", "Flaxseed", "Graines de lin", "زريعة الكتان", "zero"),
 ("peanut_butter", 172470, "nuts", "Peanut butter, smooth, unsalted", "Beurre de cacahuète", "زبدة الكاوكاو", None),
 ("tahini", 170189, "nuts", "Tahini (sesame paste)", "Tahini (purée de sésame)", "طحينة", "zero"),
 # Oils & fats
 ("olive_oil", 171413, "oils", "Olive oil", "Huile d'olive", "زيت الزيتون", "zero"),
 ("sunflower_oil", 171025, "oils", "Sunflower oil", "Huile de tournesol", "زيت المائدة (عباد الشمس)", "zero"),
 ("canola_oil", 172336, "oils", "Canola (rapeseed) oil", "Huile de colza", "زيت الكولزا", "zero"),
 ("margarine", 172347, "oils", "Margarine, tub, 80% fat", "Margarine", "مرغرين", None),
 ("mayonnaise", 171009, "packaged", "Mayonnaise, regular", "Mayonnaise", "مايونيز", None),
 # Sweets & packaged foods
 ("sugar", 169655, "packaged", "Sugar, white", "Sucre blanc", "سكر أبيض", "all"),
 ("sugar_brown", 168833, "packaged", "Sugar, brown", "Sucre roux", "سكر بني", "all"),
 ("sugar_powdered", 169656, "packaged", "Sugar, powdered (icing)", "Sucre glace", "سكر ناعم (سكر كلاصي)", "all"),
 ("honey", 169640, "packaged", "Honey", "Miel", "عسل", "all"),
 ("jam", 169641, "packaged", "Jam / preserves", "Confiture", "مربى (كونفيتور)", None),
 ("maple_syrup", 169661, "packaged", "Maple syrup", "Sirop d'érable", "شراب القيقب", "all"),
 ("molasses", 168820, "packaged", "Molasses", "Mélasse", "دبس السكر", "all"),
 ("chocolate_dark", 170273, "packaged", "Dark chocolate 70-85%", "Chocolat noir 70-85 %", "شوكولاتة داكنة 70-85%", None),
 ("chocolate_milk_bar", 167587, "packaged", "Milk chocolate", "Chocolat au lait", "شوكولاتة بالحليب", None),
 ("cookies_sandwich", 172718, "packaged", "Chocolate sandwich cookies with cream", "Biscuits fourrés au chocolat", "بسكويت محشو بالشوكولاتة", None),
 ("cookies_butter", 172819, "packaged", "Butter cookies", "Biscuits au beurre", "بسكويت بالزبدة", None),
 ("cake_pound", 172704, "packaged", "Pound cake, butter", "Quatre-quarts", "كيك (مادلين)", None),
 ("cake_sponge", 172706, "packaged", "Sponge cake", "Génoise", "كيك إسفنجي", None),
 ("croissant", 174987, "bread", "Croissant, butter", "Croissant au beurre", "كرواسون", None),
 ("doughnut", 174992, "packaged", "Doughnut, glazed", "Beignet glacé (donut)", "دونات", None),
 ("ice_cream", 167575, "packaged", "Ice cream, vanilla", "Glace à la vanille", "مثلجات بالفانيلا", None),
 ("chips", 169677, "packaged", "Potato chips, salted", "Chips salées", "شيبس", None),
 ("popcorn", 167959, "packaged", "Popcorn, air-popped", "Pop-corn soufflé à l'air", "فشار (بوب كورن)", "zero"),
 ("pizza_cheese", 170317, "packaged", "Cheese pizza, frozen, cooked", "Pizza fromage surgelée", "بيتزا بالجبن", None),
 ("hamburger", 170693, "packaged", "Hamburger, fast food, plain", "Hamburger (fast-food)", "هامبرغر", None),
 ("french_fries", 170698, "packaged", "French fries, fast food", "Frites (fast-food)", "فريت", None),
 ("ketchup", 168556, "packaged", "Ketchup", "Ketchup", "كاتشب", None),
 ("pasta_sauce", 171192, "packaged", "Tomato pasta sauce, ready-to-serve", "Sauce tomate pour pâtes", "صلصة طماطم جاهزة", None),
 ("soup_chicken_noodle", 172909, "packaged", "Chicken noodle soup, canned, prepared", "Soupe poulet vermicelles en conserve", "حساء الدجاج بالشعرية (معلب)", None),
 # Drinks
 ("water", 174158, "drinks", "Water, bottled", "Eau en bouteille", "ماء معدني", "zero"),
 ("tea_black", 173227, "drinks", "Black tea, brewed, unsweetened", "Thé noir infusé, sans sucre", "شاي أسود بدون سكر", "zero"),
 ("tea_green", 171917, "drinks", "Green tea, brewed, unsweetened", "Thé vert infusé, sans sucre", "أتاي أخضر بدون سكر", "zero"),
 ("tea_herbal", 173232, "drinks", "Herbal tea, brewed, unsweetened", "Tisane infusée, sans sucre", "منقوع أعشاب بدون سكر", "zero"),
 ("coffee", 171890, "drinks", "Coffee, brewed, black", "Café noir", "قهوة كحلة", "zero"),
 ("orange_juice", 169098, "drinks", "Orange juice, fresh", "Jus d'orange frais", "عصير البرتقال الطبيعي", "zero"),
 ("apple_juice", 173933, "drinks", "Apple juice, unsweetened", "Jus de pomme sans sucre ajouté", "عصير التفاح بدون سكر مضاف", "zero"),
 ("orange_drink", 169044, "drinks", "Orange juice drink (sweetened)", "Boisson à l'orange sucrée", "مشروب برتقال محلى", None),
 ("cola", 174852, "drinks", "Cola soft drink", "Soda cola", "مشروب غازي كولا", "all"),
 ("lemon_soda", 173205, "drinks", "Lemon-lime soda", "Soda citron", "مشروب غازي ليمون", "all"),
 ("orange_soda", 174854, "drinks", "Orange soda", "Soda orange", "مشروب غازي برتقال", "all"),
 ("energy_drink", 173210, "drinks", "Energy drink (sugar-sweetened)", "Boisson énergisante sucrée", "مشروب طاقة محلى", "all"),
 ("chocolate_milk", 170879, "drinks", "Chocolate milk", "Lait au chocolat", "حليب بالشوكولاتة", None),
 ("almond_milk", 174832, "drinks", "Almond drink, unsweetened", "Boisson amande sans sucre", "حليب اللوز بدون سكر", "zero"),
 # Spices
 ("cumin", 170923, "spices", "Cumin", "Cumin", "كمون", "zero"),
 ("paprika", 171329, "spices", "Paprika", "Paprika", "تحميرة (فلفلة حلوة)", "zero"),
 ("cinnamon", 171320, "spices", "Cinnamon, ground", "Cannelle", "قرفة", "zero"),
 ("ginger_ground", 170926, "spices", "Ginger, ground", "Gingembre en poudre", "سكنجبير", "zero"),
 ("turmeric", 172231, "spices", "Turmeric", "Curcuma", "خرقوم", "zero"),
 ("black_pepper", 170931, "spices", "Black pepper", "Poivre noir", "إبزار", "zero"),
 ("coriander_seed", 170922, "spices", "Coriander seed", "Graines de coriandre", "زريعة القزبور", "zero"),
 ("anise_seed", 171316, "spices", "Anise seed", "Graines d'anis", "النافع (حبة حلاوة)", "zero"),
 ("salt", 173468, "spices", "Salt", "Sel", "ملح", "zero"),
 ("vinegar", 173469, "spices", "Vinegar, cider", "Vinaigre de cidre", "خل التفاح", "zero"),
]

NUTR = {"1008": "kcal", "1003": "protein", "1005": "carbs", "1004": "fat", "1079": "fiber", "2000": "sugar", "1093": "sodium"}

def main(src, out):
    ids = {str(f[1]) for f in FOODS}
    desc = {}
    with open(os.path.join(src, "food.csv"), newline="") as fh:
        for r in csv.DictReader(fh):
            if r["fdc_id"] in ids:
                desc[r["fdc_id"]] = r["description"]
    vals = {i: {} for i in ids}
    with open(os.path.join(src, "food_nutrient.csv"), newline="") as fh:
        for r in csv.DictReader(fh):
            if r["fdc_id"] in ids and r["nutrient_id"] in NUTR:
                vals[r["fdc_id"]][NUTR[r["nutrient_id"]]] = float(r["amount"])
    units = {}
    with open(os.path.join(src, "measure_unit.csv"), newline="") as fh:
        for r in csv.DictReader(fh):
            units[r["id"]] = r["name"]
    portions = {i: [] for i in ids}
    with open(os.path.join(src, "food_portion.csv"), newline="") as fh:
        for r in csv.DictReader(fh):
            if r["fdc_id"] in ids and r["gram_weight"]:
                unit = units.get(r["measure_unit_id"], "")
                unit = "" if unit == "undetermined" else unit
                label = " ".join(x for x in [r["amount"].rstrip("0").rstrip(".") if r["amount"] else "", unit, r["modifier"], r["portion_description"]] if x).strip()
                g = float(r["gram_weight"])
                if label and g > 0:
                    portions[r["fdc_id"]].append({"label": label, "grams": round(g, 1)})
    out_rows = []
    missing = []
    for key, fid, cat, en, fr, ar, rule in FOODS:
        s = str(fid)
        if s not in desc:
            missing.append(key); continue
        v = vals[s]
        sugar = v.get("sugar")  # may be absent in SR Legacy => unknown
        added = None
        added_basis = "unknown"
        if rule == "zero":
            added, added_basis = 0.0, "single_ingredient"
        elif rule == "all" and sugar is not None:
            added, added_basis = sugar, "sweetener"
        out_rows.append({
            "id": key, "fdcId": fid, "category": cat,
            "name": {"en": en, "fr": fr, "ar": ar},
            "usdaDescription": desc[s],
            "per100g": {
                "kcal": v.get("kcal"), "protein": v.get("protein"), "carbs": v.get("carbs"),
                "fat": v.get("fat"), "fiber": v.get("fiber"), "sugar": sugar, "addedSugar": added,
                "sodium": v.get("sodium"),
            },
            "addedSugarBasis": added_basis,
            "portions": portions[s][:5],
            "source": "USDA FoodData Central, SR Legacy (April 2018)",
        })
    if missing:
        print("MISSING:", missing, file=sys.stderr); sys.exit(1)
    with open(out, "w") as fh:
        json.dump(out_rows, fh, ensure_ascii=False, indent=0)
    print(f"wrote {len(out_rows)} foods to {out}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
