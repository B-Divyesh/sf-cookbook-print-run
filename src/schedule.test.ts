import { describe, expect, it } from 'vitest';
import { buildTimeline, formatClock, parseClock } from './schedule';
import type { Recipe } from './types';

function recipe(title: string, prepMinutes: number, cookMinutes: number): Recipe {
  return { id: title, title, author: '', source: '', sourceUrl: '', attribution: '', baseServings: 4, servings: 4, prepMinutes, cookMinutes, ingredients: [], instructions: [], allergenNotes: '', selected: true };
}

describe('consolidated timeline', () => {
  it('works backward from one serving time and sorts all recipes together', () => {
    const timeline = buildTimeline([recipe('Roast', 15, 45), recipe('Salad', 10, 0)], '18:30');
    expect(timeline[0]).toMatchObject({ minute: 1050, label: 'Start prep', recipeTitle: 'Roast' });
    expect(timeline.map((item) => `${item.label}:${item.recipeTitle}`)).toContain('Start prep:Salad');
    expect(timeline.at(-1)?.minute).toBe(1110);
  });

  it('keeps recipes with unknown timing visible', () => {
    expect(buildTimeline([recipe('Mystery', 0, 0)], '18:30')[0]?.label).toMatch(/Timing not supplied/);
  });

  it('formats clock values accessibly', () => {
    expect(parseClock('06:05')).toBe(365);
    expect(formatClock(1110)).toBe('6:30 pm');
    expect(formatClock(-30)).toBe('11:30 pm previous day');
  });
});
