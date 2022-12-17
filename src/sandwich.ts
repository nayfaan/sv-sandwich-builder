import data from './data/ingredients.json';
import { getMealPowerVector, getTypeVector, Power } from './powers';
import { Flavor, MealPower, TypeName } from './strings';
import { diff, innerProduct, norm } from './vector-math';
export interface Ingredient {
  name: string;
  mealPowerBoosts: Record<MealPower, number | undefined>;
  typeBoosts: Record<TypeName, number | undefined>;
  flavorBoosts: Record<Flavor, number | undefined>;
  baseMealPowerVector: number[];
  tasteMealPowerVector: number[];
  typeVector: number[];
  imagePath: string;
  pieces: number;
  ingredientType: 'filling' | 'condiment';
}

export interface Sandwich {
  ingredients: Ingredient[];
  condiments: Ingredient[];
  mealPowerBoosts: Record<string, number>;
  typeBoosts: Record<string, number>;
}

interface SelectIngredientProps {
  targetPower: Power;
  baseMealPowerVector: number[];
  baseTypeVector: number[];
  checkType: boolean;
  allowFillings: boolean;
  allowCondiments: boolean;
}

type IngredientAggregation = {
  best: Ingredient;
  score: number;
};

const maxFillings = 6;
const maxCondiments = 4;
const emptySandwich: Sandwich = {
  ingredients: [],
  condiments: [],
  mealPowerBoosts: {},
  typeBoosts: {},
};

const selectIngredient = ({
  targetPower,
  baseMealPowerVector,
  baseTypeVector,
  checkType,
  allowFillings,
  allowCondiments,
}: SelectIngredientProps) => {
  const mealPowerVector = getMealPowerVector(
    targetPower,
    norm(baseMealPowerVector),
  );
  const typeVector = checkType
    ? getTypeVector(targetPower, norm(baseMealPowerVector))
    : [];

  const targetMealPowerVector = diff(mealPowerVector, baseMealPowerVector);
  const targetTypeVector = diff(typeVector, baseTypeVector);

  const ingredientReducer = (
    agg: IngredientAggregation,
    ing: Ingredient,
  ): IngredientAggregation => {
    if (
      (!allowFillings && ing.ingredientType === 'filling') ||
      (!allowCondiments && ing.ingredientType === 'condiment')
    ) {
      return agg;
    }
    const mealPowerProduct = innerProduct(
      ing.baseMealPowerVector,
      targetMealPowerVector,
    );
    // TODO; taste
    const typeProduct = checkType
      ? innerProduct(ing.typeVector, targetTypeVector)
      : 0;
    const ingScore = mealPowerProduct + typeProduct;
    if (ingScore <= agg.score) {
      return agg;
    }
    return {
      best: ing,
      score: ingScore,
    };
  };

  const { best, score } = data.reduce<IngredientAggregation>(
    ingredientReducer,
    {
      best: {} as Ingredient,
      score: -Infinity,
    },
  );

  return best;
};

// TO DO: target more than one power
const modifySandwichForPower = (
  baseSandwich: Sandwich,
  targetPower: Power,
): Sandwich | null => {
  const fillings = [...baseSandwich.ingredients];
  const condiments = [...baseSandwich.condiments];

  while (fillings.length < maxFillings || condiments.length < maxCondiments) {
    // TODO
    break;
  }
  return null;
};

// Learning: there can be no more than 12 of a single ingredient, or 15 in multiplayer
// Learning: Num pieces for an ingredient each count separately
// Learning: order is very important for types and powers
