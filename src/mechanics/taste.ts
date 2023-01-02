import { Flavor, flavors, MealPower, mealPowers } from '../strings';
import { add, scale } from '../vector-math';
import { Boosts, boostsEqual } from './boost';

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

const primaryFlavorsForPower: Record<MealPower, Flavor | null> = {
  Egg: 'Sweet',
  Humungo: 'Hot',
  Teensy: 'Sour',
  Item: 'Bitter',
  Encounter: 'Salty',
  Exp: 'Bitter',
  Catch: 'Sweet',
  Raid: 'Sweet',
  Title: null,
  Sparkling: null,
};

const secondaryFlavorsForPower: Record<MealPower, Flavor[]> = {
  Egg: ['Salty', 'Bitter'],
  Humungo: [],
  Teensy: [],
  Item: ['Hot', 'Sour', 'Sweet'],
  Encounter: [],
  Exp: ['Salty'],
  Catch: ['Sour'],
  Raid: ['Hot'],
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

export const makeMealPowerVectors = (
  flavorBoosts: Boosts<Flavor>,
  pieces = 1,
) => {
  const components = mealPowers.map((mp) => {
    const primaryFlavor = primaryFlavorsForPower[mp];
    const secondaryFlavors = secondaryFlavorsForPower[mp];
    if (!primaryFlavor) return { primary: 0, secondary: 0 };

    const primaryAmount = flavorBoosts[primaryFlavor] || 0;
    const otherAmounts = Object.entries(flavorBoosts)
      .filter(
        ([flavor]) =>
          flavor !== primaryFlavor &&
          !secondaryFlavors.includes(flavor as Flavor),
      )
      .map(([flavor, amount]) => amount);
    const maxOther = otherAmounts.length > 0 ? Math.max(...otherAmounts) : 0;

    if (secondaryFlavors.length === 0) {
      return {
        primary: pieces * (primaryAmount - maxOther),
        secondary: 0,
      };
    }

    const secondaryAmounts = Object.entries(flavorBoosts)
      .filter(([flavor]) => secondaryFlavors.includes(flavor as Flavor))
      .map(([flavor, amount]) => amount);
    const maxSecondary =
      secondaryAmounts.length > 0 ? Math.max(...secondaryAmounts) : 0;

    if (maxOther > primaryAmount) {
      return {
        primary: pieces * (primaryAmount - maxOther),
        secondary: pieces * maxSecondary,
      };
    }
    return {
      primary: pieces * primaryAmount,
      secondary: pieces * (maxSecondary - maxOther),
    };
  });

  return {
    primary: components.map((c) => c.primary),
    secondary: components.map((c) => c.secondary),
  };
};

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
  currentFlavorBoosts: Partial<Record<Flavor, number>>;
  primaryTasteVector: number[];
  secondaryTasteVector: number[];
}

export const getRelativeTasteVector = (() => {
  // todo: memoize by currentFlavorBoosts, currentRankedFlavorBoosts, boostedPower, targetPower
  // memoize independently: ing

  let memoRankFlavorBoosts = (
    flavorBoosts: Partial<Record<Flavor, number>>,
  ) => {
    const res = rankFlavorBoosts(flavorBoosts);
    const thisFn = memoRankFlavorBoosts;
    memoRankFlavorBoosts = (b: Partial<Record<Flavor, number>>) =>
      boostsEqual(flavorBoosts, b) ? res : thisFn(b);
    return res;
  };

  return ({
    currentFlavorBoosts,
    primaryTasteVector,
    secondaryTasteVector,
  }: RelativeTasteVectorProps) => {
    const currentRankedFlavorBoosts = memoRankFlavorBoosts(currentFlavorBoosts);

    const highestBoostAmount = currentRankedFlavorBoosts[0]?.amount || 0;
    const highestBoostedFlavor = currentRankedFlavorBoosts[0]?.name;
    const secondHighestBoostAmount = currentRankedFlavorBoosts[1]?.amount || 0;
    const secondHighestBoostedFlavor = currentRankedFlavorBoosts[1]?.name;
    const thirdHighestBoostAmount = currentRankedFlavorBoosts[2]?.amount || 0;

    return mealPowers.map((mp, i) => {
      const primaryFlavor = primaryFlavorsForPower[mp];
      const secondaryFlavors = secondaryFlavorsForPower[mp];
      if (!primaryFlavor) return 0;

      const absPrimaryComponent = primaryTasteVector[i] || 0;
      let relPrimaryComponent: number;
      if (highestBoostedFlavor !== primaryFlavor) {
        // Flavor needed to achieve desired power boost
        // Assumption: needed > 0
        const needed =
          highestBoostAmount - (currentFlavorBoosts[primaryFlavor] || 0) + 1;

        const invScaleFactor = Math.max(needed, needed - absPrimaryComponent);
        relPrimaryComponent = (absPrimaryComponent * 100) / invScaleFactor;
      } else {
        // Difference between highest flavor and the runner up that threatens to change the boosted meal power
        const dangerThreshold = Math.max(
          highestBoostAmount - secondHighestBoostAmount,
          1,
        );
        relPrimaryComponent = Math.max(
          Math.min((absPrimaryComponent * 100) / dangerThreshold, 100),
          -100,
        );
      }

      if (secondaryFlavors.length === 0) return relPrimaryComponent;

      const absSecondaryComponent = secondaryTasteVector[i] || 0;
      let halfRelSecondaryComponent: number;
      if (!secondaryFlavors.includes(secondHighestBoostedFlavor)) {
        const secondaryFlavorComponents = secondaryFlavors.reduce<number>(
          (sum, flavor) => {
            // Flavor needed to achieve desired power boost
            // Assumption: needed > 0
            const needed =
              secondHighestBoostAmount - (currentFlavorBoosts[flavor] || 0) + 1;

            const invScaleFactor = Math.max(
              needed,
              needed - absSecondaryComponent,
            );
            return sum + (absSecondaryComponent * 50) / invScaleFactor;
          },
          0,
        );

        halfRelSecondaryComponent =
          secondaryFlavorComponents / secondaryFlavors.length;
      } else {
        // Difference between highest flavor and the runner up that threatens to change the boosted meal power
        const oneTwo = highestBoostAmount - secondHighestBoostAmount;
        const twoThree = secondHighestBoostAmount - thirdHighestBoostAmount;
        const dangerThreshold =
          oneTwo > twoThree ? Math.min(-oneTwo, -1) : Math.max(twoThree, 1);
        halfRelSecondaryComponent = Math.max(
          Math.min((absSecondaryComponent * 50) / dangerThreshold, 50),
          -50,
        );
      }
      return relPrimaryComponent / 2 + halfRelSecondaryComponent;
    });
  };
})();
