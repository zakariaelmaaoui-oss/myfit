// Approximate Moroccan market prices (MAD per kg or litre, 2025–2026, typical neighbourhood souk/supermarket).
// They are ESTIMATES used only to rank recipes by budget and show an approximate cost — prices vary by city and season.
export const PRICE_MAD_PER_KG: Record<string, number> = {
  'family:potato': 6, 'family:tomato': 7, 'family:onion': 6, 'family:carrot': 5, 'family:zucchini': 7, 'family:eggplant': 7, 'family:pepper': 10, 'family:chili': 12,
  'family:cucumber': 6, 'family:lettuce': 8, 'family:spinach': 10, 'family:cabbage': 5, 'family:cauliflower': 8, 'family:broccoli': 20, 'family:garlic': 25,
  'family:peas': 14, 'family:green': 14, 'family:turnip': 6, 'family:beet': 6, 'family:pumpkin': 7, 'family:sweet': 12, 'family:okra': 18, 'family:artichoke': 15,
  'family:parsley': 20, 'family:coriander': 20, 'family:mint': 25, 'family:mushroom': 35, 'family:celery': 12, 'family:leek': 10, 'family:corn': 15, 'family:olives': 35,
  'family:lemon': 10, 'family:ginger': 40, 'family:apple': 14, 'family:banana': 14, 'family:orange': 6, 'family:tangerine': 8, 'family:grapes': 15, 'family:strawberry': 18,
  'family:watermelon': 5, 'family:melon': 8, 'family:pear': 15, 'family:peach': 15, 'family:apricot': 15, 'family:fig': 25, 'family:dates': 50, 'family:pomegranate': 15,
  'family:avocado': 30, 'family:chicken': 38, 'family:turkey': 60, 'family:beef': 100, 'family:lamb': 120, 'family:sardine': 30, 'family:tuna': 90, 'family:salmon': 180,
  'family:cod': 90, 'family:mackerel': 30, 'family:anchovy': 30, 'family:whiting': 50, 'family:sea': 80, 'family:shrimp': 120, 'family:squid': 70,
  'family:egg': 26, egg_white: 26, 'family:milk': 8, 'family:yogurt': 20, greek_yogurt_nonfat: 50, 'family:buttermilk': 8, 'family:cheese': 90, cheese_cottage: 60,
  'family:butter': 90, 'family:cream': 60, 'family:rice': 15, 'family:couscous': 14, 'family:flour': 8, semolina: 9, 'family:barley': 10, oats: 25, 'family:pasta': 14,
  'family:vermicelli': 16, 'family:bulgur': 18, 'family:bread': 12, 'family:lentils': 18, 'family:chickpeas': 18, 'family:kidney': 20, 'family:white': 18, 'family:fava': 14,
  'family:split': 16, hummus: 60, tofu: 60, 'family:almonds': 120, 'family:walnuts': 140, 'family:peanuts': 35, 'family:peanut': 50, 'family:cashews': 180, 'family:pistachios': 220,
  'family:sesame': 50, 'family:sunflower': 40, 'family:chia': 120, 'family:flaxseed': 60, tahini: 90, olive_oil: 85, sunflower_oil: 20, canola_oil: 22, 'family:sugar': 9,
  honey: 150, jam: 40, 'family:tea': 120, 'family:coffee': 120, 'family:orange_juice': 15, 'family:chocolate': 120, 'family:tomato_paste': 20, 'family:lemon_juice': 15,
};
export const priceTable = () => new Map(Object.entries(PRICE_MAD_PER_KG));

/** Healthier or cheaper swaps (all values are recalculated from the database, nothing is invented). */
export const SWAPS: Record<string, { to: string; why: string }[]> = {
  butter: [{ to: 'olive_oil', why: 'healthier fat' }], margarine: [{ to: 'olive_oil', why: 'healthier fat' }], sunflower_oil: [{ to: 'olive_oil', why: 'healthier fat' }],
  bread_white: [{ to: 'bread_whole', why: 'more fibre' }], rice_white_cooked: [{ to: 'bulgur_cooked', why: 'more fibre' }, { to: 'rice_brown_cooked', why: 'more fibre' }],
  rice_white_raw: [{ to: 'bulgur_cooked', why: 'more fibre' }], pasta_dry: [{ to: 'lentils_raw', why: 'more protein' }], couscous_dry: [{ to: 'bulgur_cooked', why: 'more fibre' }],
  cream_heavy: [{ to: 'greek_yogurt_nonfat', why: 'far fewer kcal, more protein' }], mayonnaise: [{ to: 'greek_yogurt_nonfat', why: 'far fewer kcal' }],
  cheese_cheddar: [{ to: 'cheese_cottage', why: 'fewer kcal, more protein' }], cheese_gouda: [{ to: 'cheese_cottage', why: 'fewer kcal' }], cheese_cream: [{ to: 'cheese_cottage', why: 'fewer kcal' }],
  beef_chuck_lean: [{ to: 'chicken_breast_raw', why: 'leaner & cheaper' }, { to: 'lentils_raw', why: 'budget & vegetarian' }], lamb_ground: [{ to: 'chicken_breast_raw', why: 'leaner & cheaper' }, { to: 'beef_round_lean', why: 'leaner' }],
  chicken_thigh_raw: [{ to: 'chicken_breast_raw', why: 'leaner' }], chicken_leg_skin_raw: [{ to: 'chicken_breast_raw', why: 'leaner' }],
  chicken_breast_raw: [{ to: 'chickpeas_raw', why: 'vegetarian & cheap' }, { to: 'tofu', why: 'vegetarian' }], salmon_raw: [{ to: 'sardine_canned_tomato', why: 'much cheaper, same omega-3' }, { to: 'mackerel_raw', why: 'cheaper' }],
  tuna_oil: [{ to: 'tuna_water', why: 'fewer kcal' }], sugar: [{ to: 'dates_deglet', why: 'with fibre (still sweet)' }], milk_whole: [{ to: 'milk_low', why: 'fewer kcal' }], yogurt_plain_whole: [{ to: 'yogurt_plain_low', why: 'fewer kcal' }],
  potato_raw: [{ to: 'sweet_potato', why: 'more fibre' }, { to: 'cauliflower', why: 'far fewer kcal' }],
};
