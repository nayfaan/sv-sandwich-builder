import { ReactElement, useCallback, useState } from 'react';
import { GitHub } from 'react-feather';
import PowerQuery, { QueryOptions } from '@/component/PowerQuery';
import ResultSet, {
  CreativeResult,
  Result,
  ResultState,
  ResultType,
} from '@/component/ResultSet';
import {
  getMealForPowers,
  getRecipeForPowers,
  makeSandwichesForPowers,
} from '@/search';
import { Power } from '@/types';
import s from './App.module.css';

import 'swiper/css';

function App(): ReactElement {
  const [results, setResults] = useState<Result[]>([]);
  const [resultState, setResultState] = useState<ResultState>(ResultState.INIT);

  const handleQuery = useCallback(
    (newQuery: Power[], options: QueryOptions = {}) => {
      if (resultState === ResultState.CALCULATING) return;

      const results: Result[] = [];
      if (options.includeMeals) {
        const meal = getMealForPowers(newQuery);
        if (meal) {
          results.push({ resultType: ResultType.MEAL, ...meal });
        }
      }

      if (options.includeRecipes) {
        const recipe = getRecipeForPowers(newQuery);
        if (recipe) {
          results.push({ resultType: ResultType.RECIPE, ...recipe });
        }
      }

      if (options.includeCreative) {
        setResultState(ResultState.CALCULATING);
        setTimeout(async () => {
          const creativeSandwiches = await makeSandwichesForPowers(newQuery);
          results.push(
            ...creativeSandwiches.map(
              (s): CreativeResult => ({
                resultType: ResultType.CREATIVE,
                ...s,
              }),
            ),
          );
          setResults(results);
          setResultState(ResultState.RESULT);
        }, 10);
      } else {
        setResults(results);
        setResultState(ResultState.RESULT);
      }
    },
    [resultState],
  );

  return (
    <>
      <section>
        <div className="sectionHeader">
          <h2>Query</h2>
        </div>
        <PowerQuery
          onSubmit={handleQuery}
          enableSubmit={resultState !== ResultState.CALCULATING}
        />
      </section>
      <section>
        <div className="sectionHeader">
          <h2>Results</h2>
        </div>
        <div className={s.resultSetContainer}>
          <ResultSet results={results} resultState={resultState} />
        </div>
      </section>
      <section className="links">
        <div className="sectionHeader">
          <h2>Links</h2>
        </div>
        <p>
          <a
            href="https://github.com/iapetos163/sv-sandwich-builder/issues"
            target="_blank"
            rel="noreferrer"
          >
            <GitHub /> Report a bug on GitHub
          </a>
        </p>
        <p>
          <a
            href="https://github.com/iapetos163/sv-sandwich-builder"
            target="_blank"
            rel="noreferrer"
          >
            <GitHub /> View project source on GitHub
          </a>
        </p>
        <p>
          This project would not have been possible without data and code from
          the{' '}
          <a
            href="https://cecilbowen.github.io/pokemon-sandwich-simulator/"
            target="_blank"
            rel="noreferrer"
          >
            Pokémon&nbsp;Sandwich&nbsp;Simulator
          </a>
          .
        </p>
      </section>
    </>
  );
}

export default App;
