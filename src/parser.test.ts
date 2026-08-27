import { describe, expect, it } from 'vitest';
import { durationToMinutes, parseRecipeText, scaleIngredient, validateRecipe } from './parser';

describe('recipe imports', () => {
  it('parses a Markdown recipe and preserves attribution fields', () => {
    const markdown = `---
servings: 2
prepMinutes: 10
cookTime: PT25M
author: Jules Example
sourceUrl: https://example.com/soup
attribution: Used with permission
---
# Green soup
## Ingredients
- 2 cups peas
- 1 lemon
## Method
1. Simmer the peas.
2. Blend and season.
## Allergens
Check the stock label.`;
    const [recipe] = parseRecipeText(markdown, 'soup.md');
    expect(recipe).toMatchObject({
      title: 'Green soup', author: 'Jules Example', sourceUrl: 'https://example.com/soup',
      attribution: 'Used with permission', baseServings: 2, prepMinutes: 10, cookMinutes: 25
    });
    expect(recipe?.ingredients).toEqual(['2 cups peas', '1 lemon']);
    expect(recipe?.instructions).toHaveLength(2);
    expect(recipe?.allergenNotes).toBe('Check the stock label.');
  });

  it('accepts a JSON recipe array and common schema.org fields', () => {
    const recipes = parseRecipeText(JSON.stringify([{
      name: 'Toast', recipeYield: '3 servings', prepTime: 'PT5M', cookTime: 'PT10M',
      recipeIngredient: ['3 slices bread'], recipeInstructions: [{ text: 'Toast it.' }]
    }]), 'recipes.json');
    expect(recipes).toHaveLength(1);
    expect(recipes[0]).toMatchObject({ title: 'Toast', baseServings: 3, prepMinutes: 5, cookMinutes: 10 });
  });

  it('reports malformed JSON with an actionable filename', () => {
    expect(() => parseRecipeText('{bad', 'broken.json')).toThrow(/broken\.json is not valid JSON/);
  });

  it('keeps incomplete recipes while identifying missing content', () => {
    const [recipe] = parseRecipeText('# Notes only', 'notes.md');
    expect(validateRecipe(recipe!)).toEqual(['ingredients', 'instructions']);
  });
});

describe('serving conversion', () => {
  it('scales decimals, fractions, mixed fractions, and unicode fractions', () => {
    expect(scaleIngredient('2 cups flour', 1.5)).toBe('3 cups flour');
    expect(scaleIngredient('1/2 tsp salt', 2)).toBe('1 tsp salt');
    expect(scaleIngredient('1 1/2 cups stock', 2)).toBe('3 cups stock');
    expect(scaleIngredient('1½ cups couscous', 2)).toBe('3 cups couscous');
  });

  it('does not invent a quantity', () => expect(scaleIngredient('salt to taste', 2)).toBe('salt to taste'));
  it('parses readable and ISO durations', () => {
    expect(durationToMinutes('1 hour 20 min')).toBe(80);
    expect(durationToMinutes('PT2H5M')).toBe(125);
  });
});
