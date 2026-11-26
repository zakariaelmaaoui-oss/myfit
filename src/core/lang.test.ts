import { it, expect } from 'vitest';
import { replyLanguage } from '../../api/_lib/agent';
it('detects reply language', () => {
  expect(replyLanguage('klit jouj bidat w sandwich', 'en')).toMatch(/LATIN/);
  expect(replyLanguage('bghit nakol ghir 600 calories', 'en')).toMatch(/LATIN/);
  expect(replyLanguage('ch7al b9ali', 'en')).toMatch(/LATIN/);
  expect(replyLanguage('شنو ناكل فالعشا', 'en')).toMatch(/ARABIC/);
  expect(replyLanguage('Les pompes me font mal au poignet', 'dar')).toBe('French');
  expect(replyLanguage('How many calories left?', 'dar')).toBe('English');
});
import { degenerate } from '../../api/_lib/agent';
it('detects degenerate loops', () => {
  expect(degenerate('Tqaddamt. ' + '3la l7al. '.repeat(20))).toBe(true);
  expect(degenerate('B9a lik 1602 kcal lyoum. Dinner: chicken brochettes 247 kcal. Fish 217 kcal. Kefta 237 kcal. Khdem wa7ed. Bon appétit.')).toBe(false);
});
