import { it, expect } from 'vitest';
import { searchFoods } from './foods';
it('ranks whole-word matches first', () => {
  expect(searchFoods('egg')[0].category).toBe('eggs');
  expect(searchFoods('bread')[0].category).toBe('bread');
  expect(searchFoods('sardine')[0].id).toMatch(/^sardine/);
});
