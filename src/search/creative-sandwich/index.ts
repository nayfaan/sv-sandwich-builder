import { ingredients } from '@/data';
// import { Flavor, MealPower, TypeIndex } from '@/enum';
import { Model, solve } from '@/lp';
import { requestedPowersValid, getPowersForIngredients } from '@/mechanics';
import { Ingredient, Power, Sandwich } from '@/types';
import { getModel } from './model';
import { selectInitialTargets, Target } from './target';

export const emptySandwich = {
  fillings: [],
  condiments: [],
  powers: [],
};

export const makeSandwichForPowers = (
  targetPowers: Power[],
): Sandwich | null => {
  if (!requestedPowersValid(targetPowers)) {
    return null;
  }

  const targets = selectInitialTargets({
    targetPowers,
    avoidHerbaMystica: true,
  });
  // const expectedSuccessfulTargets = targets.filter(
  //   (t) =>
  //     t.typeAllocation === 'ONE_THREE_TWO' &&
  //     t.flavorProfile![0] === Flavor.SOUR &&
  //     t.flavorProfile![1] === Flavor.SWEET &&
  //     t.typesByPlace[0] === TypeIndex.DARK,
  // );
  // console.debug(expectedSuccessfulTargets);
  const sandwiches = targets
    .map((target) => makeSandwichForTarget(target))
    .filter((s): s is SandwichResult => !!s);
  sandwiches.sort((a, b) => a.score - b.score);
  const result = sandwiches[0];
  if (!result) return null;
  const powers = getPowersForIngredients(
    result.fillings.concat(result.condiments),
  );

  // console.debug(result.target);
  // console.debug(JSON.stringify(result.model));

  return {
    ...result,
    powers,
  };
};

type SandwichResult = {
  score: number;
  fillings: Ingredient[];
  condiments: Ingredient[];
  model: Model;
  target: Target;
};

const makeSandwichForTarget = (
  target: Target,
  multiplayer = false,
): SandwichResult | null => {
  const model = getModel({ multiplayer, target });

  const solution = solve(model);
  if (solution.status === 'infeasible') return null;

  const score = solution.objectiveValue ?? 0;

  const fillings: Ingredient[] = [];
  const condiments: Ingredient[] = [];

  Object.entries(solution.variables).forEach(([name, count]) => {
    const ingredient = ingredients.find((i) => i.name === name);
    if (!ingredient) return;
    if (ingredient.ingredientType === 'filling') {
      [...Array(count).keys()].forEach(() => fillings.push(ingredient));
    } else {
      [...Array(count).keys()].forEach(() => condiments.push(ingredient));
    }
  });

  return { fillings, condiments, score, model, target };
};
