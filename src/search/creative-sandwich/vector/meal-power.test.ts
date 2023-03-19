import { MealPower, TypeIndex } from '../../../enum';
import { rankMealPowerBoosts } from '../../../mechanics/powers';
import { diff } from '../../../vector-math';
import {
  getTargetMealPowerVector,
  sortTargetPowersByMpPlace,
} from './meal-power';

describe('getTargetMealPowerVector', () => {
  it('Does not output zero when given a zero vector', () => {
    const v = getTargetMealPowerVector({
      targetPowers: [
        {
          mealPower: MealPower.TEENSY,
          type: TypeIndex.STEEL,
          level: 3,
        },
      ],
      targetConfigSet: [
        {
          typeAllocation: 'ONE_ONE_THREE',
          typePlaceIndex: 0,
          mpPlaceIndex: 2,
        },
      ],
      rankedMealPowerBoosts: [],
      mealPowerVector: [],
    });
    expect(v[8]).toBeGreaterThan(0);
  });
  it('Does not attempt to force positioning', () => {
    const v = getTargetMealPowerVector({
      targetPowers: [
        {
          mealPower: MealPower.TEENSY,
          type: TypeIndex.STEEL,
          level: 3,
        },
      ],
      targetConfigSet: [
        {
          typeAllocation: 'ONE_ONE_THREE',
          typePlaceIndex: 0,
          mpPlaceIndex: 2,
        },
      ],
      rankedMealPowerBoosts: [],
      mealPowerVector: [],
    });
    expect(v[0]).toBe(0);
  });
  it('Does not output zero when given Egg power and zero', () => {
    const v = getTargetMealPowerVector({
      targetPowers: [
        {
          mealPower: MealPower.EGG,
          type: TypeIndex.STEEL,
          level: 3,
        },
      ],
      targetConfigSet: [
        {
          typeAllocation: 'ONE_ONE_THREE',
          typePlaceIndex: 0,
          mpPlaceIndex: 2,
        },
      ],
      rankedMealPowerBoosts: [],
      mealPowerVector: [],
    });
    expect(v[0]).toBeGreaterThan(0);
  });

  it('Does not bump up targets to 100 when mpPlaceIndex of boost power is 0', () => {
    const res = getTargetMealPowerVector({
      targetPowers: [
        { mealPower: MealPower.EXP, type: 5, level: 1 },
        { mealPower: MealPower.CATCH, type: 5, level: 1 },
      ],
      targetConfigSet: [
        {
          typeAllocation: 'ONE_THREE_ONE',
          typePlaceIndex: 0,
          mpPlaceIndex: 0,
        },
        {
          typeAllocation: 'ONE_THREE_ONE',
          typePlaceIndex: 0,
          mpPlaceIndex: 2,
        },
      ],
      rankedMealPowerBoosts: [],
      mealPowerVector: [],
      boostPower: MealPower.EXP,
    });

    const compOver100Index = res.findIndex((c) => c >= 100);
    expect(compOver100Index).toBe(-1);
  });

  it('Does not factor in boosts for meal powers in later places', () => {
    const mealPowerVector = [5, 0, 18, 9, 0, 0, 0, 0, -15, 12];
    const v = getTargetMealPowerVector({
      targetPowers: [
        { mealPower: MealPower.EXP, type: 15, level: 1 },
        { mealPower: MealPower.ITEM, type: 1, level: 1 },
        { mealPower: MealPower.ENCOUNTER, type: 12, level: 1 },
      ],
      targetConfigSet: [
        {
          typeAllocation: 'ONE_THREE_TWO',
          typePlaceIndex: 1,
          mpPlaceIndex: 2,
        },
        {
          typeAllocation: 'ONE_THREE_TWO',
          typePlaceIndex: 0,
          mpPlaceIndex: 0,
        },
        {
          typeAllocation: 'ONE_THREE_TWO',
          typePlaceIndex: 2,
          mpPlaceIndex: 1,
        },
      ],
      mealPowerVector,
      rankedMealPowerBoosts: rankMealPowerBoosts(mealPowerVector),
      boostPower: MealPower.ITEM,
    });
    const compOver100Index = v.findIndex((c) => c >= 100);
    expect(compOver100Index).toBe(-1);
  });

  it('Does not undershoot current vector', () => {
    const mealPowerVector = [0, 0, 21, -3, 0, 0, 0, 0, 0, 12];
    const v = getTargetMealPowerVector({
      targetPowers: [
        { mealPower: 2, type: 15, level: 1 },
        { mealPower: 3, type: 1, level: 1 },
        { mealPower: 9, type: 12, level: 1 },
      ],
      targetConfigSet: [
        {
          typeAllocation: 'ONE_THREE_TWO',
          typePlaceIndex: 1,
          mpPlaceIndex: 2,
        },
        {
          typeAllocation: 'ONE_THREE_TWO',
          typePlaceIndex: 0,
          mpPlaceIndex: 0,
        },
        {
          typeAllocation: 'ONE_THREE_TWO',
          typePlaceIndex: 2,
          mpPlaceIndex: 1,
        },
      ],
      mealPowerVector,
      rankedMealPowerBoosts: rankMealPowerBoosts(mealPowerVector),
      boostPower: 3,
    });

    const deltaVector = diff(v, mealPowerVector);
    const negativeCompIndex = deltaVector.findIndex((c) => c < 0);
    expect(negativeCompIndex).toBe(-1);
  });
});

describe('sortTargetPowersByMpPlace', () => {
  it('Sorts in descending order', () => {
    const res = sortTargetPowersByMpPlace(
      [
        {
          mealPower: MealPower.EGG,
          type: TypeIndex.STEEL,
          level: 3,
        },
        {
          mealPower: MealPower.TITLE,
          type: TypeIndex.STEEL,
          level: 3,
        },
      ],
      [
        {
          typeAllocation: 'ONE_ONE_THREE',
          typePlaceIndex: 0,
          mpPlaceIndex: 2,
        },
        {
          typeAllocation: 'ONE_ONE_THREE',
          typePlaceIndex: 0,
          mpPlaceIndex: 1,
        },
      ],
    );

    expect(res[0][1]).toBe(2);
    expect(res[1][1]).toBe(1);
  });
});
