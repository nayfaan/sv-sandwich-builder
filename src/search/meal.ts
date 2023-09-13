import { meals } from '@/data';
import { powerSetsMatch } from '@/mechanics';
import { Meal, Power } from '@/types';

const RESULT_LIMIT = 3;

export const getMealsForPowers = (targetPowers: Power[]) => {
  const matchingMeals = meals.filter((meal) =>
    powerSetsMatch(meal.powers, targetPowers),
  );

  matchingMeals.sort((a, b) => a.cost - b.cost);

  type Accum = { meals: Meal[]; covered: { [town: string]: true } };
  // Different meals that cover as many towns as possible
  const { meals: coveringMeals } = matchingMeals.reduce<Accum>(
    ({ meals, covered }, meal) => {
      if (meal.towns.some((town) => !covered[town])) {
        return {
          meals: [...meals, meal],
          covered: {
            ...covered,
            ...Object.fromEntries(meal.towns.map((t) => [t, true])),
          },
        };
      }
      return { meals, covered };
    },
    { meals: [], covered: {} },
  );

  return coveringMeals.slice(0, RESULT_LIMIT);
};
