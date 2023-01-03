import { ingredients, Ingredient } from '../data';
import { Flavor, MealPower, TypeName } from '../strings';
import { add, diff, innerProduct, norm } from '../vector-math';
import { Boosts } from './boost';
import {
  addBoosts,
  boostMealPowerVector,
  evaluateBoosts,
  getTargetLevelVector,
  getTargetMealPowerVector,
  getTargetTypeVector,
  mealPowerHasType,
  Power,
  powersMatch,
  powerToString,
} from './powers';
import {
  getRelativeTasteVector,
  getBoostedMealPower,
  rankFlavorBoosts,
  FlavorBoost,
} from './taste';

export interface Sandwich {
  fillings: Ingredient[];
  condiments: Ingredient[];
  mealPowerBoosts: Partial<Record<MealPower, number>>;
  typeBoosts: Partial<Record<TypeName, number>>;
  flavorBoosts: Partial<Record<Flavor, number>>;
}

interface SelectIngredientProps {
  targetPower: Power;
  currentBoostedMealPowerVector: number[];
  currentTypeVector: number[];
  checkMealPower: boolean;
  checkType: boolean;
  checkLevel: boolean;
  remainingFillings: number;
  remainingCondiments: number;
  skipIngredients: Record<string, boolean>;
  currentFlavorBoosts: Boosts<Flavor>;
}

type IngredientAggregation = {
  best: Ingredient;
  score: number;
};

// TODO: change these for multiplayer
const maxFillings = 6;
const maxCondiments = 4;
const maxPieces = 12;

export const emptySandwich: Sandwich = {
  fillings: [],
  condiments: [],
  mealPowerBoosts: {},
  flavorBoosts: {},
  typeBoosts: {},
};

const getBaseVector = (currentVector: number[]) => {
  // const minComponent = Math.min(...currentVector);
  return currentVector.map((comp) => (comp >= 0 ? 0 : comp));
};

const getBaseDelta = (target: number[], current: number[]) => {
  const base = getBaseVector(current);
  return norm(diff(target, base));
};

const MP_FILLING = 21;
const MP_CONDIMENT = 21;
const TYPE_FILLING = 36;
const TYPE_CONDIMENT = 4;

interface ScoreWeightProps {
  targetVector: number[];
  deltaVector: number[];
  currentVector: number[];
  remainingFillings: number;
  remainingCondiments: number;
}

const getMpScoreWeight = ({
  targetVector,
  deltaVector,
  currentVector,
  remainingFillings,
  remainingCondiments,
}: ScoreWeightProps) => {
  const baseDelta = getBaseDelta(targetVector, currentVector);
  const progress = norm(deltaVector) / baseDelta;

  return (
    progress /
    (MP_FILLING * remainingFillings + MP_CONDIMENT * remainingCondiments)
  );
};

const getTypeScoreWeight = ({
  targetVector,
  deltaVector,
  currentVector,
  remainingFillings,
  remainingCondiments,
}: ScoreWeightProps) => {
  const baseDelta = getBaseDelta(targetVector, currentVector);
  const progress = norm(deltaVector) / baseDelta;

  return (
    progress /
    (TYPE_FILLING * remainingFillings + TYPE_CONDIMENT * remainingCondiments)
  );
};

const selectIngredient = ({
  targetPower,
  currentBoostedMealPowerVector,
  currentTypeVector,
  currentFlavorBoosts,
  checkMealPower,
  checkType,
  checkLevel,
  skipIngredients,
  remainingCondiments,
  remainingFillings,
}: SelectIngredientProps) => {
  const targetMealPowerVector = getTargetMealPowerVector(
    targetPower,
    currentBoostedMealPowerVector,
  );
  const targetTypeVector = checkType
    ? getTargetTypeVector(targetPower, currentTypeVector)
    : currentTypeVector;

  const targetLevelVector = getTargetLevelVector(
    targetPower,
    currentTypeVector,
  );
  const deltaMealPowerVector = diff(
    targetMealPowerVector,
    currentBoostedMealPowerVector,
  );
  const deltaTypeVector = diff(targetTypeVector, currentTypeVector);
  const deltaLevelVector = diff(targetLevelVector, currentTypeVector);

  const typeScoreWeight = checkType
    ? getTypeScoreWeight({
        targetVector: targetTypeVector,
        deltaVector: deltaTypeVector,
        currentVector: currentTypeVector,
        remainingFillings,
        remainingCondiments,
      })
    : 0;
  const levelScoreWeight = checkLevel
    ? getTypeScoreWeight({
        targetVector: targetLevelVector,
        deltaVector: deltaLevelVector,
        currentVector: currentTypeVector,
        remainingFillings,
        remainingCondiments,
      })
    : 0;
  const mealPowerScoreWeight = checkMealPower
    ? getMpScoreWeight({
        targetVector: targetMealPowerVector,
        deltaVector: deltaMealPowerVector,
        currentVector: currentBoostedMealPowerVector,
        remainingFillings,
        remainingCondiments,
      })
    : 0;

  let bestMealPowerProduct = -Infinity;
  let bestTypeProduct = -Infinity;
  let bestLevelProduct = -Infinity;

  const ingredientReducer = (
    agg: IngredientAggregation,
    ing: Ingredient,
  ): IngredientAggregation => {
    if (
      (remainingFillings <= 0 && ing.ingredientType === 'filling') ||
      (remainingCondiments <= 0 && ing.ingredientType === 'condiment') ||
      skipIngredients[ing.name]
    ) {
      return agg;
    }

    const relativeTasteVector = getRelativeTasteVector({
      currentFlavorBoosts,
      primaryTasteVector: ing.primaryTasteMealPowerVector,
      secondaryTasteVector: ing.secondaryTasteMealPowerVector,
    });
    const boostedMealPowerVector = add(
      ing.baseMealPowerVector,
      relativeTasteVector,
    );

    // const positiveBoostedMpNorm = norm(
    //   boostedMealPowerVector.map((c) => (c > 0 ? c : 0)),
    // );
    const deltaMpNorm = norm(deltaMealPowerVector);
    const n1 = deltaMpNorm;
    const mealPowerProduct =
      checkMealPower && n1 !== 0
        ? innerProduct(boostedMealPowerVector, deltaMealPowerVector) / n1
        : 0;

    const n2 = norm(deltaTypeVector);
    const typeProduct =
      checkType && n2 !== 0
        ? innerProduct(ing.typeVector, deltaTypeVector) / n2
        : 0;
    const n3 = norm(deltaLevelVector);
    const levelProduct =
      n3 !== 0 ? innerProduct(ing.typeVector, deltaLevelVector) / n3 : 0;
    const ingScore =
      mealPowerProduct * mealPowerScoreWeight +
      typeProduct * typeScoreWeight +
      levelProduct * levelScoreWeight;

    if (ing.name === 'Egg' || ing.name === 'Bacon') {
      console.debug(
        `${ing.name}:
    Raw scores: ${mealPowerProduct}, ${typeProduct}, ${levelProduct}
    Primary Taste meal power vector: ${ing.primaryTasteMealPowerVector},
    Secondary Taste meal power vector: ${ing.secondaryTasteMealPowerVector},
    Relative taste vector: ${relativeTasteVector}
    Boosted meal power vector: ${boostedMealPowerVector}
      n1: ${n1}`,
      );
    }
    if (ingScore <= agg.score) {
      return agg;
    }
    bestMealPowerProduct = mealPowerProduct;
    bestTypeProduct = typeProduct;
    bestLevelProduct = levelProduct;
    return {
      best: ing,
      score: ingScore,
    };
  };

  const { best: bestIngredient } = ingredients.reduce<IngredientAggregation>(
    ingredientReducer,
    {
      best: {} as Ingredient,
      score: -Infinity,
    },
  );
  console.debug(`Selecting ${bestIngredient.name}
  Weights: ${mealPowerScoreWeight}, ${typeScoreWeight}, ${levelScoreWeight}
  Raw scores: ${bestMealPowerProduct}, ${bestTypeProduct}, ${bestLevelProduct}

  Target MP: ${targetMealPowerVector}
  Delta MP: ${deltaMealPowerVector}
  Current MP: ${currentBoostedMealPowerVector}
  Target T: ${targetTypeVector}
  Delta T: ${deltaTypeVector}
  Target L: ${targetLevelVector}
  Delta L: ${deltaLevelVector}
  Current T: ${currentTypeVector}`);

  return bestIngredient;
};

// TODO: target more than one power
export const makeSandwichForPower = (targetPower: Power): Sandwich | null => {
  console.log('~~~HAZ SANDWICH~~~');
  const fillings: Ingredient[] = [];
  const condiments: Ingredient[] = [];
  const skipIngredients: Record<string, boolean> = {};
  if (
    targetPower.mealPower !== 'Sparkling' &&
    targetPower.mealPower !== 'Title'
  ) {
    for (const ingredient of ingredients) {
      if (ingredient.isHerbaMystica) {
        skipIngredients[ingredient.name] = true;
      }
    }
  }

  let currentBaseMealPowerVector: number[] = [];
  let currentTypeVector: number[] = [];
  let currentMealPowerBoosts: Partial<Record<MealPower, number>> = {};
  let currentFlavorBoosts: Partial<Record<Flavor, number>> = {};
  let currentTypeBoosts: Partial<Record<TypeName, number>> = {};
  let currentPowers: Power[] = [];
  let targetPowerFound = false;
  let boostedMealPower: MealPower | null = null;
  let rankedFlavorBoosts: FlavorBoost[] = [];

  const checkType = mealPowerHasType(targetPower.mealPower);

  while (fillings.length < maxFillings || condiments.length < maxCondiments) {
    const currentBoostedMealPowerVector = boostedMealPower
      ? boostMealPowerVector(currentBaseMealPowerVector, boostedMealPower)
      : currentBaseMealPowerVector;

    //     console.log(`Current MP (Boosted): ${currentBoostedMealPowerVector}
    // Current T: ${currentTypeVector}`);
    const selectedPower = currentPowers[0];
    const newIngredient = selectIngredient({
      targetPower,
      currentBoostedMealPowerVector,
      currentTypeVector,
      checkMealPower:
        targetPowerFound || selectedPower?.mealPower !== targetPower.mealPower,
      checkType:
        targetPowerFound ||
        (checkType && selectedPower?.type !== targetPower.type),
      checkLevel:
        !selectedPower?.level || selectedPower.level < targetPower.level,
      remainingFillings:
        !targetPowerFound || fillings.length === 0
          ? maxFillings - fillings.length
          : 0,
      remainingCondiments:
        !targetPowerFound || condiments.length === 0
          ? maxCondiments - condiments.length
          : 0,
      currentFlavorBoosts,
      skipIngredients,
    });

    if (newIngredient.ingredientType === 'filling') {
      fillings.push(newIngredient);

      const numOfIngredient = fillings.filter(
        (f) => f.name === newIngredient.name,
      ).length;
      const numPieces = numOfIngredient * newIngredient.pieces;
      // console.log(newIngredient.name, numPieces);
      if (numPieces + newIngredient.pieces > maxPieces) {
        // console.log('Skipping', newIngredient.name);
        skipIngredients[newIngredient.name] = true;
      }
    } else {
      condiments.push(newIngredient);
    }

    currentBaseMealPowerVector = add(
      currentBaseMealPowerVector,
      newIngredient.baseMealPowerVector,
    );
    currentTypeVector = add(currentTypeVector, newIngredient.typeVector);
    currentMealPowerBoosts = addBoosts(
      currentMealPowerBoosts,
      newIngredient.mealPowerBoosts,
      newIngredient.pieces,
    );
    currentFlavorBoosts = addBoosts(
      currentFlavorBoosts,
      newIngredient.flavorBoosts,
      newIngredient.pieces,
    );
    currentTypeBoosts = addBoosts(
      currentTypeBoosts,
      newIngredient.typeBoosts,
      newIngredient.pieces,
    );
    rankedFlavorBoosts = rankFlavorBoosts(currentFlavorBoosts);
    boostedMealPower = getBoostedMealPower(rankedFlavorBoosts);

    // console.log(currentMealPowerBoosts, boostedMealPower, currentTypeBoosts);

    currentPowers = evaluateBoosts(
      currentMealPowerBoosts,
      boostedMealPower,
      currentTypeBoosts,
    );
    console.log(
      `Current powers:${['', ...currentPowers.map(powerToString)].join(
        '\n  ',
      )}`,
    );
    targetPowerFound = currentPowers.some((p) => powersMatch(p, targetPower));

    if (targetPowerFound && fillings.length > 0 && condiments.length > 0) {
      return {
        fillings,
        condiments,
        typeBoosts: currentTypeBoosts,
        flavorBoosts: currentFlavorBoosts,
        mealPowerBoosts: currentMealPowerBoosts,
      };
    }
  }

  return null;
};
