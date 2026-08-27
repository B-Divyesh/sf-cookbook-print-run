import type { Recipe, TimelineEvent } from './types';

export function parseClock(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 18 * 60;
  return Math.min(23, Number(match[1])) * 60 + Math.min(59, Number(match[2]));
}

export function buildTimeline(recipes: Recipe[], serveAt: string): TimelineEvent[] {
  const finish = parseClock(serveAt);
  const events: TimelineEvent[] = [];
  recipes.filter((recipe) => recipe.selected).forEach((recipe) => {
    const prep = Math.max(0, recipe.prepMinutes);
    const cook = Math.max(0, recipe.cookMinutes);
    if (prep || cook) {
      events.push({ minute: finish - prep - cook, label: prep ? 'Start prep' : 'Get started', recipeTitle: recipe.title, kind: 'prep' });
      if (cook) events.push({ minute: finish - cook, label: 'Start cooking', recipeTitle: recipe.title, kind: 'cook' });
    } else {
      events.push({ minute: finish, label: 'Timing not supplied — follow recipe', recipeTitle: recipe.title, kind: 'prep' });
    }
    events.push({ minute: finish, label: 'Ready to serve', recipeTitle: recipe.title, kind: 'serve' });
  });
  return events.sort((a, b) => a.minute - b.minute || a.recipeTitle.localeCompare(b.recipeTitle));
}

export function formatClock(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  const day = minutes < 0 ? ' previous day' : minutes >= 1440 ? ' next day' : '';
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}${day}`;
}
