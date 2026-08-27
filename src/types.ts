export interface Recipe {
  id: string;
  title: string;
  author: string;
  source: string;
  sourceUrl: string;
  attribution: string;
  baseServings: number;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  ingredients: string[];
  instructions: string[];
  allergenNotes: string;
  selected: boolean;
}

export interface TimelineEvent {
  minute: number;
  label: string;
  recipeTitle: string;
  kind: 'prep' | 'cook' | 'serve';
}

export interface StoredState {
  recipes: Recipe[];
  packetTitle: string;
  serveAt: string;
}
