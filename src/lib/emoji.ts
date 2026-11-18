import type { Food } from './foods';
import type { Recipe } from '../data/recipes';

// Decorative emoji for foods and recipes (purely visual; no data meaning).
const BY_FAMILY: [RegExp, string][] = [
  [/^potato|^sweet_potato|french_fries/, '🥔'], [/^tomato/, '🍅'], [/^onion|^leek/, '🧅'], [/^carrot/, '🥕'], [/^zucchini|^cucumber/, '🥒'],
  [/^eggplant/, '🍆'], [/^pepper|^chili/, '🫑'], [/^lettuce|^spinach|^cabbage|^parsley|^coriander|^mint|^celery|^artichoke/, '🥬'],
  [/^cauliflower|^broccoli/, '🥦'], [/^garlic/, '🧄'], [/^peas|^green_beans|^okra/, '🫛'], [/^corn|^popcorn/, '🌽'], [/^mushroom/, '🍄'],
  [/^olives/, '🫒'], [/^lemon/, '🍋'], [/^ginger/, '🫚'], [/^apple|apple_juice/, '🍎'], [/^banana/, '🍌'], [/^orange|^tangerine/, '🍊'],
  [/^grapes|^raisins/, '🍇'], [/^strawberry/, '🍓'], [/^watermelon/, '🍉'], [/^melon/, '🍈'], [/^pear/, '🍐'], [/^peach|^apricot/, '🍑'],
  [/^cherry|^plum|^prunes/, '🍒'], [/^kiwi/, '🥝'], [/^mango/, '🥭'], [/^pineapple/, '🍍'], [/^avocado/, '🥑'], [/^dates|^fig/, '🌴'],
  [/^pomegranate|^prickly/, '❤️'], [/^chicken|^turkey/, '🍗'], [/^beef|^lamb|^hamburger/, '🥩'], [/^sardine|^tuna|^salmon|^cod|^mackerel|^anchovy|^whiting|^sea_bass/, '🐟'],
  [/^shrimp/, '🦐'], [/^squid/, '🦑'], [/^egg/, '🥚'], [/^milk|^buttermilk|^almond_milk|^chocolate_milk/, '🥛'], [/^yogurt|^greek/, '🥣'],
  [/^cheese/, '🧀'], [/^butter|^margarine|^cream/, '🧈'], [/^rice/, '🍚'], [/^couscous|^semolina|^bulgur|^barley/, '🌾'], [/^flour|^wheat/, '🌾'],
  [/^oats|^granola|^cornflakes|^cheerios/, '🥣'], [/^pasta|^vermicelli|^soup/, '🍝'], [/^bread|^crackers/, '🍞'], [/^croissant/, '🥐'],
  [/^lentils|^chickpeas|^kidney|^white_beans|^fava|^split|^hummus|^tofu/, '🫘'], [/^almonds|^walnuts|^peanut|^cashews|^pistachios/, '🥜'],
  [/^sesame|^sunflower_seeds|^chia|^flax|^tahini/, '🌰'], [/oil$/, '🫗'], [/^sugar|^honey|^jam|^maple|^molasses/, '🍯'],
  [/^chocolate|^cookies/, '🍫'], [/^cake|^doughnut/, '🍩'], [/^ice_cream/, '🍨'], [/^chips/, '🥔'], [/^pizza/, '🍕'], [/^ketchup|^pasta_sauce/, '🥫'],
  [/^mayonnaise/, '🫙'], [/^water/, '💧'], [/^tea/, '🍵'], [/^coffee/, '☕'], [/juice|_drink$/, '🧃'], [/^cola|soda$|energy/, '🥤'],
  [/^salt|^cumin|^paprika|^cinnamon|^turmeric|^black_pepper|_seed$|^vinegar/, '🧂'], [/^beet|^turnip|^pumpkin/, '🎃'],
];
const BY_CAT: Record<string, string> = { vegetables: '🥗', fruits: '🍎', meat: '🥩', chicken: '🍗', fish: '🐟', eggs: '🥚', dairy: '🥛', cereals: '🌾',
  bread: '🍞', legumes: '🫘', nuts: '🥜', oils: '🫗', packaged: '📦', drinks: '🥤', spices: '🧂', custom: '🏷️' };

export function foodEmoji(f?: Food): string {
  if (!f) return '🍽️';
  const id = f.id.replace(/^custom:/, '');
  for (const [re, e] of BY_FAMILY) if (re.test(id)) return e;
  return BY_CAT[f.category] ?? '🍽️';
}

export function recipeEmoji(r: Recipe): string {
  const id = r.id;
  if (/tea/.test(id)) return '🍵';
  if (/couscous/.test(id)) return '🍛';
  if (/tagine|rfissa|loubia|adass/.test(id)) return '🥘';
  if (/harira|bissara|soup/.test(id)) return '🍲';
  if (/salad|zaalouk|taktouka/.test(id)) return '🥗';
  if (/msemen|baghrir|khobz|harcha/.test(id)) return '🫓';
  if (/egg|omelette|tortilla/.test(id)) return '🍳';
  if (/oats|lben|yogurt/.test(id)) return '🥣';
  if (/orange|fruit/.test(id)) return '🍊';
  if (/salmon|sardine|fish|tuna/.test(id)) return '🐟';
  if (/chicken|brochette/.test(id)) return '🍢';
  if (/pasta|seffa/.test(id)) return '🍝';
  if (/rice/.test(id)) return '🍚';
  if (/hummus|chickpea|lentil/.test(id)) return '🫘';
  if (/breakfast/.test(id)) return '🍽️';
  return '🍽️';
}
