import { Flavor, flavors, MealPower, mealPowers } from '../strings';
import { Boosts } from '../types';

export interface FlavorBoost {
  name: Flavor;
  amount: number;
}

const tasteMap: Record<Flavor, Record<Flavor, MealPower>> = {
  Sweet: {
    Sweet: 'Egg',
    Salty: 'Egg',
    Sour: 'Catch',
    Bitter: 'Egg',
    Hot: 'Raid',
  },
  Salty: {
    Salty: 'Encounter',
    Sweet: 'Encounter',
    Sour: 'Encounter',
    Bitter: 'Exp',
    Hot: 'Encounter',
  },
  Sour: {
    Sour: 'Teensy',
    Sweet: 'Catch',
    Salty: 'Teensy',
    Bitter: 'Teensy',
    Hot: 'Teensy',
  },
  Bitter: {
    Bitter: 'Item',
    Sweet: 'Item',
    Salty: 'Exp',
    Sour: 'Item',
    Hot: 'Item',
  },
  Hot: {
    Hot: 'Humungo',
    Sweet: 'Raid',
    Salty: 'Humungo',
    Sour: 'Humungo',
    Bitter: 'Humungo',
  },
};

/** If has more than one element, then it is a subset of secondaryFlavorsForPower[power] */
const primaryFlavorsForPower: Record<MealPower, Flavor[]> = {
  Egg: ['Sweet'],
  Humungo: ['Hot'],
  Teensy: ['Sour'],
  Item: ['Bitter'],
  Encounter: ['Salty'],
  Exp: ['Bitter', 'Salty'],
  Catch: ['Sweet', 'Sour'],
  Raid: ['Sweet', 'Hot'],
  Title: [],
  Sparkling: [],
};

const secondaryFlavorsForPower: Record<MealPower, Flavor[]> = {
  Egg: ['Salty', 'Bitter'],
  Humungo: ['Salty', 'Bitter', 'Sour'],
  Teensy: ['Salty', 'Bitter', 'Hot'],
  Item: ['Hot', 'Sour', 'Sweet'],
  Encounter: ['Sweet', 'Hot', 'Sour'],
  Exp: ['Salty', 'Bitter'],
  Catch: ['Sour', 'Sweet'],
  Raid: ['Hot', 'Sweet'],
  Title: [],
  Sparkling: [],
};

/*
  const componentFlavors: Record<MealPower, Flavor[]> = {
    Egg: ['Sweet'],
    Humungo: ['Hot'],
    Teensy: ['Sour'],
    Item: ['Bitter'],
    Encounter: ['Salty'],
    Exp: ['Bitter', 'Salty'],
    Catch: ['Sweet', 'Sour'],
    Raid: ['Sweet', 'Hot'],
    Title: [],
    Sparkling: [],
  };
  */

export const getBoostedMealPower = (rankedFlavorBoosts: FlavorBoost[]) => {
  if (rankedFlavorBoosts.length === 0 || rankedFlavorBoosts[0].amount <= 0) {
    return null;
  }

  const firstFlavor = rankedFlavorBoosts[0].name;
  const secondFlavor = rankedFlavorBoosts[1]?.name || firstFlavor;

  return tasteMap[firstFlavor][secondFlavor];
};

export const rankFlavorBoosts = (
  flavorBoosts: Partial<Record<Flavor, number>>,
) =>
  Object.entries(flavorBoosts)
    .sort(
      ([fa, va], [fb, vb]) =>
        vb - va ||
        flavors.indexOf(fa as Flavor) - flavors.indexOf(fb as Flavor),
    )
    .map(([f, v]) => ({ name: f as Flavor, amount: v }));

export interface RelativeTasteVectorProps {
  currentFlavorBoosts: Boosts<Flavor>;
  ingredientFlavorBoosts: Boosts<Flavor>;
}

/**
 * Takes the sum of two numbers,
 * scales that by 100,
 * and clamps that between -100 and 100.
 */
const sumScaleClamp = (n1: number, n2: number) =>
  100 * Math.max(Math.min(n1 + n2, 1), -1);

export const getRelativeTasteVector = (() => {
  const flavorBoostsLookup: Partial<Record<string, FlavorBoost[]>> = {};
  const memoRankFlavorBoosts = (flavorBoosts: Boosts<Flavor>) => {
    const key = flavors.map((f) => flavorBoosts[f] || 0).join(',');
    const memoized = flavorBoostsLookup[key];
    if (memoized) return memoized;
    const res = rankFlavorBoosts(flavorBoosts);
    flavorBoostsLookup[key] = res;
    return res;
  };

  return ({
    currentFlavorBoosts,
    ingredientFlavorBoosts,
  }: RelativeTasteVectorProps) => {
    const currentRankedFlavorBoosts = memoRankFlavorBoosts(currentFlavorBoosts);

    const highestBoostAmount = currentRankedFlavorBoosts[0]?.amount || 0;
    const highestBoostFlavor = currentRankedFlavorBoosts[0]?.name;
    const secondHighestBoostAmount = currentRankedFlavorBoosts[1]?.amount || 0;

    return mealPowers.map((mp, i) => {
      const primaryFlavors = primaryFlavorsForPower[mp];
      const secondaryFlavors = secondaryFlavorsForPower[mp];
      const numPrimary = primaryFlavors.length;
      const numSecondary = secondaryFlavors.length;
      const numTotal = numPrimary + numSecondary;
      if (numPrimary === 0) return 0;

      const nonPrimaryFlavors = flavors.filter(
        (f) => !primaryFlavors.includes(f),
      );
      const otherFlavors = nonPrimaryFlavors.filter(
        (f) => !secondaryFlavors.includes(f),
      );

      const primaryFirstMatch = primaryFlavors.find(
        (f) => f === highestBoostFlavor,
      );

      if (highestBoostAmount === 0) {
        const highestBoostForOther = Math.max(
          ...otherFlavors
            .filter((f) => (currentFlavorBoosts[f] || 0) >= highestBoostAmount)
            .map((f) => ingredientFlavorBoosts[f] || 0),
        );
        const primaryComponents = primaryFlavors.map((f) => {
          const ingBoost = ingredientFlavorBoosts[f] || 0;
          return (ingBoost - highestBoostForOther / 2) / Math.max(ingBoost, 1);
        });
        const secondaryComponents = secondaryFlavors.map((f) => {
          const ingBoost = ingredientFlavorBoosts[f] || 0;
          return (ingBoost - highestBoostForOther / 2) / Math.max(ingBoost, 1);
        });

        return sumScaleClamp(
          (numSecondary * Math.max(...primaryComponents)) / numTotal,
          (numPrimary * Math.max(...secondaryComponents)) / numTotal,
        );
      }

      // Delicate case to consider here:
      // If primary != secondary and two are tied
      // We think we're defending but we aren't
      if (!primaryFirstMatch) {
        const secondaryFirstMatches = secondaryFlavors.filter(
          (f) => (currentFlavorBoosts[f] || 0) >= highestBoostAmount,
        );

        const otherFlavorsBelowHighest = otherFlavors.filter(
          (f) => (currentFlavorBoosts[f] || 0) < highestBoostAmount,
        );

        const highestBoostForCurrentNonprimaryHighest = Math.max(
          ...nonPrimaryFlavors
            .filter((f) => (currentFlavorBoosts[f] || 0) >= highestBoostAmount)
            .map((f) => ingredientFlavorBoosts[f] || 0),
        );

        const primaryComponents = primaryFlavors.map((f) => {
          const ingBoost = ingredientFlavorBoosts[f] || 0;
          const currentBoost = currentFlavorBoosts[f] || 0;

          const targetHighestBoost = Math.max(
            currentBoost + 1,
            highestBoostAmount,
          );
          return (
            (ingBoost - highestBoostForCurrentNonprimaryHighest) /
            Math.max(targetHighestBoost - currentBoost, ingBoost, 1)
          );
        });
        if (secondaryFirstMatches.length === 0) {
          // offensive on primary, toward highestBoostAmount
          // offensive on secondary, toward highestBoostAmount
          // primary supporters: primaries
          // secondary supporters: secondaries
          // primary detractors: others >= highestBoostAmount
          // secondary detractors: others < highestBoostAmount

          const others2 = Math.max(
            ...otherFlavorsBelowHighest.map(
              (f) => ingredientFlavorBoosts[f] || 0,
            ),
          );

          const secondaryComponents = secondaryFlavors.map((f) => {
            const ingBoost = ingredientFlavorBoosts[f] || 0;
            const currentBoost = currentFlavorBoosts[f] || 0;
            return (
              (ingBoost - others2) /
              Math.max(highestBoostAmount - currentBoost, ingBoost, 1)
            );
          });

          return sumScaleClamp(
            (numSecondary * Math.max(...primaryComponents)) / numTotal,
            (numPrimary * Math.max(...secondaryComponents)) / numTotal,
          );
        }
        // offensive on primary, toward highestBoostAmount
        // defensive on nonPrimary secondary, from highestBoostAmount
        // primary supporters: primaries
        // primary detractors: nonprimaries >= highestBoostAmount
        // secondary detractors: others < highestBoostAmount
        // neutral: secondary < highestBoostAmount

        const otherToHighest = otherFlavorsBelowHighest.map((f) => {
          const ingBoost = ingredientFlavorBoosts[f] || 0;
          const currentBoost = currentFlavorBoosts[f] || 0;
          return (
            ingBoost / Math.max(highestBoostAmount - currentBoost, ingBoost, 1)
          );
        });

        // if (i === 7)
        //   console.debug({
        //     primary: Math.max(...primaryComponents),
        //     secondary: -Math.max(...otherToHighest),
        //   });

        return sumScaleClamp(
          (numSecondary * Math.max(...primaryComponents)) / numTotal,
          (numPrimary * -Math.max(...otherToHighest)) / numTotal,
        );
      }

      /*
      Established:
      * highestBoostAmount > 0
      * primaryFirstMatches.length > 0
      */
      const secondarySecondMatches = secondaryFlavors.filter(
        (f) => (currentFlavorBoosts[f] || 0) === secondHighestBoostAmount,
      );

      const nonPrimariesFromSecondToHighest = nonPrimaryFlavors
        .filter(
          (f) => (currentFlavorBoosts[f] || 0) >= secondHighestBoostAmount,
        )
        .map((f) => {
          const ingBoost = ingredientFlavorBoosts[f] || 0;
          const currentBoost = currentFlavorBoosts[f] || 0;
          return (
            ingBoost / Math.max(highestBoostAmount - currentBoost, ingBoost, 1)
          );
        });

      const othersToSecond = otherFlavors
        .filter((f) => (currentFlavorBoosts[f] || 0) < secondHighestBoostAmount)
        .map((f) => {
          const ingBoost = ingredientFlavorBoosts[f] || 0;
          const currentBoost = currentFlavorBoosts[f] || 0;
          return (
            ingBoost /
            Math.max(secondHighestBoostAmount - currentBoost, ingBoost, 1)
          );
        });

      if (
        secondHighestBoostAmount === 0 ||
        secondarySecondMatches.length === 0
      ) {
        // Whatever's on second isn't a primary
        // defensive on primary from highestBoostAmount
        // offensive on secondary toward secondHighestBoostAmount
        // secondary supporters: secondaries < secondHighestBoostAmount
        // primary detractors: nonprimaries >= secondHighestBoostAmount
        // Secondary detractors: others < secondHighestBoostAmount
        // neutral: primaries

        const secondariesToSecond = secondaryFlavors
          .filter(
            (f) => (currentFlavorBoosts[f] || 0) < secondHighestBoostAmount,
          )
          .map((f) => {
            const ingBoost = ingredientFlavorBoosts[f] || 0;
            const currentBoost = currentFlavorBoosts[f] || 0;
            return (
              ingBoost /
              Math.max(secondHighestBoostAmount - currentBoost, ingBoost, 1)
            );
          });

        return sumScaleClamp(
          (numSecondary * -Math.max(...nonPrimariesFromSecondToHighest, 0)) /
            numTotal,
          numPrimary * Math.max(...secondariesToSecond, 0) -
            Math.max(...othersToSecond, 0) / numTotal,
        );
      }

      /*
      Established:
      * highestBoostAmount > 0
      * secondHighestBoostAmount > 0
      * primaryFirstMatches.length > 0
      * secondarySecondMatches.length > 0
      */

      // defensive on primary from highestBoostAmount
      // defensive on secondary from secondHighestBoostAmount
      // primary detractors: nonprimaries >= secondHighestBoostAmount
      // secondary detractors: others < secondHighestBoostAmount
      // neutral: primaries, secondaries < secondHighestBoostAmount
      return sumScaleClamp(
        (numSecondary * -Math.max(...nonPrimariesFromSecondToHighest, 0)) /
          numTotal,
        (numPrimary * -Math.max(...othersToSecond, 0)) / numTotal,
      );
    });
  };
})();
