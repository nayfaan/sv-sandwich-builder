import { MealPower, TypeIndex } from './enum';
import { Constraint, Objective } from './lp';

export interface Power {
  mealPower: MealPower;
  type: TypeIndex;
  level: number;
}

export interface Ingredient {
  name: string;
  isHerbaMystica: boolean;
  flavorVector: number[];
  baseMealPowerVector: number[];
  typeVector: number[];
  imagePath: string;
  pieces: number;
  ingredientType: 'filling' | 'condiment';
}

export interface Sandwich {
  fillings: Ingredient[];
  condiments: Ingredient[];
  // mealPowerBoosts: number[];
  // typeBoosts: number[];
  // flavorBoosts: number[];
  powers: Power[];
  score: number;
}

export interface SandwichRecipe {
  number: string;
  name: string;
  fillings: Ingredient[];
  condiments: Ingredient[];
  powers: Power[];
  imagePath: string;
  gameLocation: string;
}

export interface Meal {
  name: string;
  cost: number;
  powers: Power[];
  shop: string;
  towns: string[];
  imagePath: string;
}

export type LinearConstraints = {
  objective: Objective;
  constraintSets: {
    multiplayerPieces: Constraint[];
    singlePlayerPieces: Constraint[];
    flavorValueDifferences: Constraint[][];
    mealPowerValueDifferences: Constraint[][];
    typeValueDifferences: Constraint[][];
    typeDiff70: Constraint[][];
    typeDiff105: Constraint[][];
  };
  coefficientSets: {
    score: Record<string, number>;
    fillings: Record<string, number>;
    condiments: Record<string, number>;
    herba: Record<string, number>;
    typeValues: Record<string, number>[];
  };
  constraints: {
    herbaMealPowerValue: Constraint;
  };
};
