// End-to-end test of the production build in local "device mode" (no Supabase needed).
// Usage: npm run build && npx vite preview --port 4173 &  then  node e2e/run.mjs
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE_URL || 'http://localhost:4173';
const SHOTS = 'e2e/screenshots'; mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const errors = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };
const step = async (name, fn) => { console.log('•', name); try { await fn(); } catch (e) { fail++; console.log('  ✗ threw:', e.message.split('\n')[0]); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US', acceptDownloads: true });
await ctx.grantPermissions(['accelerometer', 'gyroscope']).catch(() => {});
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(`pageerror ${page.url()}: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`console ${page.url()}: ${m.text()}`); });
const go = async p => { await page.goto(BASE + p); await page.waitForLoadState('networkidle'); };
const text = async () => (await page.textContent('body')) || '';
const email = `test${Date.now()}@example.com`;

await step('registration + onboarding', async () => {
  await go('/');
  ok(page.url().endsWith('/login'), 'unauthenticated user is redirected to login');
  await page.click('text=Create account');
  await page.fill('input[type=email]', email);
  const pws = page.locator('input[type=password]'); await pws.nth(0).fill('short'); await pws.nth(1).fill('short');
  await page.check('input[type=checkbox]'); await page.click('button:has-text("Create account")'); await page.waitForSelector('.err');
  ok((await text()).includes('at least 8 characters'), 'short password rejected');
  await pws.nth(0).fill('Secret123!'); await pws.nth(1).fill('Secret123!');
  await page.click('button:has-text("Create account")');
  await page.waitForURL('**/welcome');
  ok(true, 'account created → onboarding');
  await page.click('button:has-text("Next")');
  ok((await text()).includes('Please enter your name'), 'onboarding validates name');
  await page.getByLabel('First name').fill('Salma'); await page.getByLabel('Age').fill('32');
  await page.getByLabel('Height (cm)').fill('165'); await page.getByLabel('Weight (kg)').fill('75'); await page.getByLabel('Target weight (kg, optional)').fill('68');
  await page.click('button:has-text("Next")');
  await page.getByLabel('Activity level').selectOption('light'); await page.click('button.chip:has-text("Weight loss")');
  await page.click('button:has-text("Next")');
  await page.click('button.chip:has-text("Halal")'); await page.click('button.chip:has-text("Peanuts")');
  await page.getByLabel('Food budget (MAD)').fill('400');
  await page.click('button:has-text("Next")');
  await page.click('label:has-text("I am breastfeeding")');
  await page.click('button:has-text("Finish")');
  ok((await text()).includes('Please give consent'), 'health info requires consent');
  await page.click('label:has-text("I am breastfeeding")');
  await page.click('button:has-text("Finish")');
  await page.waitForURL(BASE + '/');
  ok((await text()).includes('Salma'), 'home greets user by name');
  await page.screenshot({ path: `${SHOTS}/01-home.png`, fullPage: true });
});

await step('calorie calculator', async () => {
  await go('/profile/goals');
  // Mifflin-St Jeor female: 10*75 + 6.25*165 - 5*32 - 161 = 1460.25 → 1460 ; ×1.375 = 2008 ; deficit min(500, 402)=402 → 1606
  const t = await page.textContent('[data-testid=calc-results]');
  ok(t.includes('1,460'), 'BMR = 1460 kcal'); ok(t.includes('2,008'), 'TDEE = 2008 kcal');
  ok((await page.textContent('[data-testid=calc-target]')).includes('1,606'), 'target = 1606 kcal (moderate deficit 402)');
  await page.click('button:has-text("Recalculate")'); ok((await text()).includes('Last saved calculation'), 'recalculation saved');
  await page.screenshot({ path: `${SHOTS}/02-goals.png`, fullPage: true });
});

await step('food database + portion calculation + diary', async () => {
  await go('/food/database');
  await page.fill('input[aria-label="Search food"]', 'potatoes boiled');
  await page.click('[data-testid=food-results] button >> nth=0');
  ok((await text()).includes('FDC ID 170440'), 'shows USDA source + FDC id');
  await page.click('.sheet button:has-text("Add to diary")');
  await page.fill('[data-testid=grams]', '200');
  ok((await page.textContent('[data-testid=calc-kcal]')).includes('172'), '200 g boiled potatoes = 172 kcal (86 kcal/100 g)');
  await page.locator('.sheet select').last().selectOption('lunch');
  await page.click('.sheet button:has-text("Add to diary")');
  await go('/food/diary');
  ok((await page.textContent('[data-testid=meal-lunch]')).includes('172'), 'entry appears under lunch');
  await page.click('[data-testid=meal-lunch] button[aria-label=Edit]');
  await page.fill('[data-testid=grams]', '100'); await page.click('.sheet button:has-text("Save")');
  await page.waitForTimeout(300);
  ok((await page.textContent('[data-testid=diary-total]')).includes('86'), 'edited to 100 g → 86 kcal');
  await page.click('[data-testid=meal-lunch] button[aria-label=Delete]'); await page.click('.sheet button:has-text("Yes")');
  await page.waitForTimeout(300);
  ok((await page.textContent('[data-testid=meal-lunch]')).includes('Nothing recorded'), 'entry deleted');
});


await step('recipes, Moroccan database, planner, shopping list', async () => {
  await go('/food/moroccan');
  const n = await page.locator('[data-testid=recipe-list] > a').count(); ok(n >= 30, `Moroccan recipes listed (${n})`);
  await go('/food/recipes/harira');
  const tx = await text(); ok(tx.includes('Ingredients') && tx.includes('Lentils, dry'), 'harira shows ingredients with quantities');
  ok((await page.locator('ol li').count()) >= 4, 'preparation steps shown');
  ok(tx.includes('Variations'), 'variations listed');
  await page.click('button[aria-label=Favorite]');
  await page.click('button:has-text("Add to diary")'); await page.click('.sheet button:has-text("Add")');
  await page.click('button:has-text("Add to meal plan")'); await page.click('.sheet button:has-text("Add")');
  await go('/food/recipes'); await page.click('button.chip:has-text("Vegetarian")');
  const veg = await page.textContent('[data-testid=recipe-list]'); ok(!veg.includes('Chicken tagine') && veg.includes('Zaalouk'), 'vegetarian filter works');
  await page.click('button.chip:has-text("Vegetarian")'); await page.click('button.chip:has-text("High protein")');
  ok((await page.textContent('[data-testid=recipe-list]')).includes('Chicken'), 'high-protein filter works');
  await go('/food/planner');
  ok((await text()).includes('Harira'), 'planned meal appears in weekly planner');
});

await step('budget mode (user-entered prices only)', async () => {
  await go('/food/budget');
  ok((await text()).includes('never invents prices'), 'states that prices are never invented');
  await page.locator('section:has-text("Enter a price") select').first().selectOption('lentils_raw'); await page.getByLabel('Price (MAD per kg)').fill('18');
  await page.click('section:has-text("Enter a price") button:has-text("Save")');
  ok((await text()).includes('18 MAD/kg'), 'price saved');
});


await step('sugar tracker', async () => {
  await go('/food/sugar');
  ok(Number((await page.textContent('[data-testid=sugar-total]')).replace(/[^\d.]/g, '')) > 0, 'sugar totals computed from diary');
  await page.click('button[role=tab]:has-text("Learn")'); ok((await text()).includes('Products high in added sugar'), 'education + high-sugar list');
});

await step('water + walking', async () => {
  await go('/wellness/water'); await page.click('button:has-text("+250 ml")'); await page.click('button:has-text("+500 ml")');
  ok((await page.textContent('[data-testid=water-total]')).includes('0.75'), 'water 750 ml recorded');
  await go('/wellness/walk'); await page.click('button:has-text("Start walking")'); await page.waitForTimeout(1500);
  ok(!(await page.textContent('[data-testid=walk-timer]')).includes('00:00'), 'walking timer runs');
  await page.click('button:has-text("Stop & save")'); ok((await text()).includes('not saved'), 'very short walk not saved');
  await page.getByLabel('Minutes', { exact: true }).fill('30'); await page.click('section:has-text("Add a walk manually") button:has-text("Add")');
  ok((await text()).includes('30 / 30'), 'manual walk counts toward goal');
  // 30 min, no steps, 74.4–75 kg → MET 3.5 × kg × 0.5 h ≈ 130 kcal
  const kc = Number((await page.textContent('[data-testid=walk-today-kcal]')).replace(/[^\d]/g, ''));
  ok(kc >= 125 && kc <= 135, `calories burned estimated from walk (${kc} kcal)`);
  await page.click('button:has-text("Start walking")');
  await page.evaluate(() => new Promise(res => { const t0 = performance.now(); const iv = setInterval(() => { const t = performance.now() - t0;
    window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 + 3 * Math.sin(2 * Math.PI * 2 * t / 1000) } }));
    if (t > 6200) { clearInterval(iv); res(); } }, 20); }));
  const live = await page.textContent('[data-testid=walk-live]');
  const stepsLive = Number((live.match(/Steps\s*([\d,]+)/) || [])[1]?.replace(/,/g, '') || 0);
  ok(stepsLive >= 10 && stepsLive <= 14, `motion sensor counts steps live (${stepsLive} steps in ~6 s at 2 Hz)`);
  ok(/km/.test(live) && /kcal/.test(live), 'live distance and calories shown');
  await page.click('button:has-text("Cancel")');
  await go('/'); ok((await page.textContent('[data-testid=home-burned]')).match(/1[23]\d kcal/), 'home shows calories burned today');
  await go('/coach'); ok((await text()).includes('needs the online account'), 'coach explains it needs the online account in device mode');
  ok(await page.isVisible('[data-testid=coach-card]') === false, 'coach page reachable');
});

await step('sport: exercises, workouts, tips', async () => {
  await go('/sport');
  ok((await page.locator('[data-testid=workouts] > a').count()) === 11, '11 guided workouts listed');
  ok((await page.locator('[data-testid=exercises] .li').count()) >= 60, 'exercise library listed (60+)');
  const before = Number((await page.textContent('[data-testid=sport-burned]')).replace(/[^\d]/g, ''));
  await page.click('[data-testid=exercises] button:has-text("Jump rope")');
  ok((await text()).includes('MET 11.8'), 'exercise shows how-to and MET');
  await page.fill('.sheet input[type=number]', '10'); await page.click('.sheet button:has-text("Save this exercise")'); await page.waitForTimeout(300);
  const after = Number((await page.textContent('[data-testid=sport-burned]')).replace(/[^\d]/g, ''));
  // 11.8 MET × ~74.4 kg × 10/60 h ≈ 146 kcal
  ok(after - before >= 140 && after - before <= 150, `logged exercise adds burned calories (+${after - before} kcal)`);
  ok((await text()).includes('Jump rope'), 'session appears in history');
  await page.click('[data-testid=workouts] a >> nth=0');
  await page.click('[data-testid=player] button:has-text("Start")'); await page.waitForTimeout(2300);
  ok(/00:5[78]/.test(await page.textContent('[data-testid=player]')), 'workout timer counts down');
  await page.click('[data-testid=player] button:has-text("Pause")');
  await go('/sport/tips'); ok((await page.locator('section.card').count()) === 10, '10 tips shown');
  await go('/'); ok((await page.textContent('[data-testid=home-burned]')).match(/\d{3} kcal/), 'home burned includes sport');
});

await step('emotional wellness', async () => {
  await go('/wellness/checkin');
  const yesNo = page.locator('section.card'); const c = await yesNo.count();
  for (let i = 0; i < c; i++) await yesNo.nth(i).locator('button.chip').nth(i === 1 ? 0 : 1).click(); // stressed = yes
  await page.click('button:has-text("See what might help")');
  ok((await page.textContent('[data-testid=checkin-msg]')).includes('emotions'), 'stress → emotional hunger supportive message');
  ok((await text()).includes('do not need to feel guilty'), 'no-guilt message shown');
  await go('/wellness/journal');
  for (let i = 0; i < 3; i++) { await page.check('label:has-text("loss of control") input'); await page.click('button:has-text("Save")'); await page.waitForTimeout(150); }
  ok(await page.isVisible('[data-testid=pro-support]'), 'repeated loss of control → professional support suggestion');
  await page.click('button[role=tab]:has-text("Patterns")'); ok((await text()).includes('not a diagnosis'), 'patterns shown without diagnosis');
  await go('/wellness/breathing'); await page.click('button:has-text("Start")'); await page.waitForTimeout(1200);
  ok((await page.textContent('[data-testid=breath-circle]')).includes('Breathe in'), 'breathing exercise runs');
  await go('/wellness/stress'); await page.click('button:has-text("Start")'); ok(await page.isVisible('[data-testid=stress-step]'), 'guided stress exercise runs');
  await go('/wellness/drinks'); ok((await text()).includes('liver and kidneys'), 'drinks: detox disclaimer');
  await go('/wellness/habits'); await page.locator('input[type=checkbox]').first().check(); ok(await page.locator('input[type=checkbox]').first().isChecked(), 'habit ticked');
});

await step('weight progress + calorie excess notification', async () => {
  await go('/progress/weight'); await page.fill('[data-testid=weight-input]', '74.4'); await page.click('section:has-text("Record") button:has-text("Save")');
  await page.waitForTimeout(300);
  ok((await page.textContent('[data-testid=weight-current]')).includes('74.4'), 'weight recorded');
  ok((await text()).includes('0.5–2 kg'), 'normal fluctuation explanation');
  await go('/food/database'); await page.fill('input[aria-label="Search food"]', 'olive oil'); await page.click('[data-testid=food-results] button >> nth=0');
  await page.click('.sheet button:has-text("Add to diary")'); await page.fill('[data-testid=grams]', '250'); await page.click('.sheet button:has-text("Add to diary")');
  await page.waitForTimeout(500);
  const toast = await page.textContent('.toasts'); ok(toast.includes('above your estimated target') && toast.includes('One day does not define'), 'supportive over-target message with difference');
  await page.screenshot({ path: `${SHOTS}/05-over-target.png` });
  await go('/profile/notifications'); ok((await text()).includes('above your estimated target'), 'stored in notification inbox');
});

await step('weekly report & charts', async () => {
  await go('/progress/report'); await page.click('button[aria-label=Next]');
  const r = await page.textContent('[data-testid=report]'); ok(r.includes('Average calories') && /\d/.test(r), 'current week report shows recorded data');
  await page.click('button[aria-label=Previous]'); await page.click('button[aria-label=Previous]');
  ok((await page.textContent('[data-testid=report]')).includes('no data'), 'empty week shows “no data”, nothing invented');
  await go('/progress/nutrition'); ok(await page.isVisible('.recharts-surface'), 'nutrition charts render');
});

await step('Arabic RTL + Darija + French', async () => {
  await go('/profile/language'); await page.click('button:has-text("العربية")'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'Arabic sets dir=rtl');
  ok((await page.textContent('nav')).includes('الرئيسية'), 'navigation translated to Arabic');
  await go('/'); await page.screenshot({ path: `${SHOTS}/06-home-ar.png`, fullPage: true });
  await go('/profile/language'); await page.click('button:has-text("الدارجة")'); await go('/wellness/checkin');
  ok((await text()).includes('واش أنا'), 'Darija check-in questions');
  await go('/profile/language'); await page.click('button:has-text("Français")'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.documentElement.dir) === 'ltr' && (await page.textContent('nav')).includes('Accueil'), 'French LTR');
  await go('/profile/language'); await page.click('button:has-text("English")');
});

await step('every page renders on mobile without horizontal scroll', async () => {
  const routes = ['/', '/coach', '/sport', '/sport/tips', '/sport/workout/hiit15', '/food', '/food/database', '/food/diary', '/food/recipes', '/food/recipes/couscous_beef', '/food/moroccan', '/food/planner', '/food/sugar', '/food/budget',
    '/wellness', '/wellness/checkin', '/wellness/journal', '/wellness/breathing', '/wellness/stress', '/wellness/habits', '/wellness/drinks', '/wellness/water', '/wellness/walk',
    '/progress', '/progress/weight', '/progress/nutrition', '/progress/activity', '/progress/report', '/profile', '/profile/edit', '/profile/goals', '/profile/language', '/profile/notifications', '/profile/privacy', '/profile/settings'];
  const bad = [];
  for (const r of routes) { await go(r); const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); const h1 = await page.locator('h1, h2').count(); if (ov > 1 || !h1) bad.push(`${r} (overflow ${ov}, headings ${h1})`); }
  ok(bad.length === 0, `all ${routes.length} routes render, no horizontal overflow${bad.length ? ': ' + bad.join(', ') : ''}`);
});

await step('privacy: export, logout/login persistence, password recovery', async () => {
  await go('/profile/privacy');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download my data")')]);
  ok(dl.suggestedFilename().startsWith('myfit-export-'), 'data export downloads JSON');
  await go('/profile'); await page.click('button:has-text("Log out")'); await page.waitForURL('**/login');
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', 'wrongpass1'); await page.click('form button:has-text("Log in")'); await page.waitForSelector('.err');
  ok((await text()).includes('Invalid email or password'), 'wrong password rejected');
  await page.fill('input[type=password]', 'Secret123!'); await page.click('form button:has-text("Log in")'); await page.waitForURL(BASE + '/');
  ok((await page.textContent('[data-testid=home-water]')).includes('0.75'), 'data persists after logout/login');
  await go('/profile'); await page.click('button:has-text("Log out")'); await page.click('text=Forgot password?');
  await page.fill('input[type=email]', email); await page.click('button:has-text("Send reset link")');
  ok((await text()).includes('needs the online (Supabase) mode'), 'password recovery explains device-mode limitation');
});

await step('account deletion', async () => {
  await go('/login'); await page.fill('input[type=email]', email); await page.fill('input[type=password]', 'Secret123!'); await page.click('form button:has-text("Log in")'); await page.waitForURL(BASE + '/');
  await go('/profile/privacy'); await page.click('button:has-text("Delete everything")');
  await page.fill('.sheet input', 'DELETE'); await page.click('.sheet button:has-text("Delete everything")'); await page.waitForURL('**/login');
  const left = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('myfit:') && k.split(':').length > 2 && !k.startsWith('myfit:fired') && !k.startsWith('myfit:over') && !k.startsWith('myfit:sugar')));
  ok(left.length === 0, 'all personal records removed from device');
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', 'Secret123!'); await page.click('form button:has-text("Log in")');
  ok((await text()).includes('Invalid email or password'), 'deleted account can no longer log in');
});

ok(errors.length === 0, `no runtime/console errors${errors.length ? ':\n    ' + [...new Set(errors)].slice(0, 10).join('\n    ') : ''}`);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
