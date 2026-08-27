import type { Recipe } from './types';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};

const firstString = (record: UnknownRecord, keys: string[], fallback = ''): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
};

const firstNumber = (record: UnknownRecord, keys: string[], fallback: number): number => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
};

export function durationToMinutes(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== 'string') return 0;
  const iso = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (iso) return Number(iso[1] || 0) * 60 + Number(iso[2] || 0);
  const hours = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour)/i);
  const minutes = value.match(/(\d+)\s*(?:m|min|minute)/i);
  if (hours || minutes) return Math.round(Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0));
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function stringifyIngredient(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  const item = asRecord(value);
  return [
    firstString(item, ['quantity', 'amount']),
    firstString(item, ['unit']),
    firstString(item, ['item', 'name', 'ingredient', 'text'])
  ].filter(Boolean).join(' ').trim();
}

function stringifyInstruction(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  return firstString(asRecord(value), ['text', 'instruction', 'name']);
}

function stringList(value: unknown, formatter: (item: unknown) => string): string[] {
  if (Array.isArray(value)) return value.map(formatter).filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n/).map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
  return [];
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || `recipe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeRecipe(value: unknown, fallbackTitle = 'Untitled recipe'): Recipe {
  const record = asRecord(value);
  const ingredients = stringList(record.ingredients ?? record.recipeIngredient, stringifyIngredient);
  const instructions = stringList(record.instructions ?? record.recipeInstructions ?? record.method, stringifyInstruction);
  const servings = Math.max(1, Math.round(firstNumber(record, ['servings', 'yield', 'recipeYield'], 4)));
  const prep = record.prepMinutes ?? record.prepTime;
  const cook = record.cookMinutes ?? record.cookTime;
  const authorValue = record.author;
  const author = typeof authorValue === 'object' ? firstString(asRecord(authorValue), ['name']) : firstString(record, ['author']);
  return {
    id: makeId(),
    title: firstString(record, ['title', 'name', 'recipeName'], fallbackTitle),
    author,
    source: firstString(record, ['source', 'sourceName', 'publisher']),
    sourceUrl: firstString(record, ['sourceUrl', 'url', 'canonicalUrl']),
    attribution: firstString(record, ['attribution', 'credit']),
    baseServings: servings,
    servings,
    prepMinutes: durationToMinutes(prep),
    cookMinutes: durationToMinutes(cook),
    ingredients,
    instructions,
    allergenNotes: firstString(record, ['allergenNotes', 'allergens', 'dietaryNotes']),
    selected: true
  };
}

function parseFrontmatter(markdown: string): { meta: UnknownRecord; body: string } {
  if (!markdown.startsWith('---')) return { meta: {}, body: markdown };
  const end = markdown.indexOf('\n---', 3);
  if (end < 0) return { meta: {}, body: markdown };
  const meta: UnknownRecord = {};
  markdown.slice(3, end).split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (!match) return;
    const key = match[1];
    if (!key) return;
    meta[key] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
  });
  return { meta, body: markdown.slice(end + 4) };
}

export function parseMarkdown(markdown: string, fileName = 'Recipe'): Recipe {
  const { meta, body } = parseFrontmatter(markdown);
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const sections = new Map<string, string[]>();
  let current = 'intro';
  sections.set(current, []);
  body.split(/\r?\n/).forEach((line) => {
    const heading = line.match(/^#{2,4}\s+(.+)$/);
    if (heading?.[1]) {
      current = heading[1].trim().toLowerCase();
      sections.set(current, []);
    } else if (!line.startsWith('# ')) {
      sections.get(current)?.push(line);
    }
  });
  const section = (names: string[]): string[] => {
    for (const [name, lines] of sections) {
      if (names.some((candidate) => name.includes(candidate))) {
        return lines.map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(Boolean);
      }
    }
    return [];
  };
  const record: UnknownRecord = {
    ...meta,
    title: meta.title || titleMatch?.[1] || fileName.replace(/\.(md|markdown)$/i, ''),
    ingredients: section(['ingredient']),
    instructions: section(['instruction', 'method', 'direction', 'steps']),
    allergenNotes: firstString(meta, ['allergenNotes', 'allergens']) || section(['allergen', 'dietary']).join(' ')
  };
  return normalizeRecipe(record, fileName);
}

export function parseRecipeText(text: string, fileName: string): Recipe[] {
  if (/\.json$/i.test(fileName) || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`${fileName} is not valid JSON. Check for a missing comma or quote.`);
    }
    const record = asRecord(parsed);
    const values = Array.isArray(parsed) ? parsed : Array.isArray(record.recipes) ? record.recipes : [parsed];
    const recipes = values.map((item, index) => normalizeRecipe(item, `${fileName} recipe ${index + 1}`));
    if (!recipes.length) throw new Error(`${fileName} does not contain any recipes.`);
    return recipes;
  }
  return [parseMarkdown(text, fileName)];
}

export function validateRecipe(recipe: Recipe): string[] {
  const issues: string[] = [];
  if (!recipe.title.trim()) issues.push('a title');
  if (!recipe.ingredients.length) issues.push('ingredients');
  if (!recipe.instructions.length) issues.push('instructions');
  return issues;
}

function parseQuantity(source: string): { value: number; raw: string } | null {
  const unicodeFractions: Record<string, number> = { '¼': .25, '½': .5, '¾': .75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875 };
  const unicode = source.match(/^\s*(\d+)?\s*([¼½¾⅓⅔⅛⅜⅝⅞])/);
  if (unicode?.[0] && unicode[2]) {
    return { value: Number(unicode[1] || 0) + (unicodeFractions[unicode[2]] || 0), raw: unicode[0] };
  }
  const match = source.match(/^\s*(?:(\d+)\s+)?(\d+\/\d+|\d+(?:\.\d+)?)/);
  if (!match?.[0]) return null;
  const whole = Number(match[1] || 0);
  const token = match[2] || '';
  const fraction = token.includes('/') ? token.split('/').map(Number) : null;
  const value = fraction ? whole + (fraction[0] || 0) / (fraction[1] || 1) : whole + Number(token);
  return Number.isFinite(value) ? { value, raw: match[0] } : null;
}

function friendlyNumber(value: number): string {
  const common: Array<[number, string]> = [[0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾']];
  const whole = Math.floor(value + 0.001);
  const decimal = value - whole;
  const found = common.find(([candidate]) => Math.abs(candidate - decimal) < 0.025);
  if (found) return `${whole || ''}${found[1]}`;
  return Number(value.toFixed(2)).toString();
}

export function scaleIngredient(ingredient: string, factor: number): string {
  if (Math.abs(factor - 1) < 0.001) return ingredient;
  const quantity = parseQuantity(ingredient);
  if (!quantity) return ingredient;
  return `${friendlyNumber(quantity.value * factor)} ${ingredient.slice(quantity.raw.length).trim()}`.trim();
}
