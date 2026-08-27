import { normalizeRecipe } from './parser';
import type { Recipe } from './types';

const samples = [
  {
    title: 'Lemony sheet-pan chickpeas',
    author: 'Dinner Binder sample kitchen',
    attribution: 'Original CC0 sample recipe',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 28,
    ingredients: ['2 cans chickpeas, drained', '1 lemon', '2 tbsp olive oil', '1 tsp smoked paprika', '½ tsp salt', '4 handfuls baby spinach'],
    instructions: ['Heat the oven to 220°C / 425°F.', 'Toss chickpeas with olive oil, paprika, salt, and half the lemon juice.', 'Roast on a sheet pan until crisp at the edges, about 28 minutes.', 'Fold through spinach and finish with the remaining lemon juice.'],
    allergenNotes: ''
  },
  {
    title: 'Herby couscous',
    author: 'Dinner Binder sample kitchen',
    attribution: 'Original CC0 sample recipe',
    servings: 4,
    prepMinutes: 8,
    cookMinutes: 10,
    ingredients: ['1½ cups couscous', '1½ cups vegetable stock', '1 tbsp olive oil', '½ cup chopped parsley', '¼ cup toasted pumpkin seeds'],
    instructions: ['Bring the stock to a boil.', 'Pour over the couscous, cover, and rest for 8 minutes.', 'Fluff with olive oil, then fold in parsley and pumpkin seeds.'],
    allergenNotes: 'Couscous contains wheat; check stock labels for your needs.'
  },
  {
    title: 'Cucumber mint salad',
    author: 'Dinner Binder sample kitchen',
    attribution: 'Original CC0 sample recipe',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 0,
    ingredients: ['2 cucumbers', '½ red onion', '2 tbsp apple cider vinegar', '1 tsp sugar', '¼ cup mint leaves', '1 pinch salt'],
    instructions: ['Thinly slice the cucumbers and onion.', 'Stir vinegar, sugar, and salt until dissolved.', 'Toss everything together and rest for 10 minutes before serving.'],
    allergenNotes: ''
  }
];

export function makeSamples(): Recipe[] {
  return samples.map((sample) => normalizeRecipe(sample));
}
