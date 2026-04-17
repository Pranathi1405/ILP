import { Routes } from '@angular/router';

// Author: E.Kaeith Emmanuel
export const StudentTest: Routes = [
  {
    path: 'test-home',
    loadComponent: () =>
      import(/* webpackChunkName: "test-home" */ './test-lab/test-home/test-home').then(
        (m) => m.TestHome,
      ),
  },
  {
    path: 'test-builder',
    loadComponent: () =>
      import(/* webpackChunkName: "test-builder" */ './test-lab/custom-test/builder/builder').then(
        (m) => m.Builder,
      ),
  },
  {
    path: 'test-pattern',
    loadComponent: () =>
      import(
        /* webpackChunkName: "test-pattern" */ './test-lab/custom-test/test-pattern/test-pattern'
      ).then((m) => m.TestPattern),
  },
  {
    path: 'test-instructions',
    loadComponent: () =>
      import(
        /* webpackChunkName: "test-instructions" */ './test-lab/custom-test/instructions/instructions'
      ).then((m) => m.Instructions),
  },
  {
    path: 'test-interface',
    loadComponent: () =>
      import(
        /* webpackChunkName: "test-interface" */ './test-lab/custom-test/interface/interface'
      ).then((m) => m.Interface),
  },
  {
    path: 'test-result',
    loadComponent: () =>
      import(/* webpackChunkName: "test-result" */ './test-lab/custom-test/result/result').then(
        (m) => m.Result,
      ),
  },
  {
    path: 'results/:attemptId',
    loadComponent: () =>
      import(
        /* webpackChunkName: "test-detailed-results" */ './test-lab/custom-test/detailed-results/detailed-results'
      ).then((m) => m.DetailedResults),
  },
  {
    path: 'test-analysis/:attemptId',
    loadComponent: () => import('./test-lab/viewanalysis/viewanalysis').then((m) => m.Viewanalysis),
  },
  {
    path: 'previous-tests',
    loadComponent: () =>
      import('./test-lab/previous-tests/previous-tests').then((m) => m.PreviousTests),
  },
  {
    path: 'sme-test-instructions/:testId',
    loadComponent: () =>
      import('./test-lab/sme-tests/instructions/instructions').then((m) => m.Instructions),
  },
  {
    path: 'sme-test-interface/:testId',
    loadComponent: () =>
      import('./test-lab/sme-tests/interface/interface').then((m) => m.Interface),
  },
  {
    path: 'sme-test-result/:attemptId',
    loadComponent: () => import('./test-lab/sme-tests/result/result').then((m) => m.Result),
  },
  {
    path: 'practice-home',
    loadComponent: () =>
      import(/* webpackChunkName: "practice-home" */ './practice-lab/home/home').then(
        (m) => m.Home,
      ),
  },
  {
    path: 'practice-builder',
    loadComponent: () =>
      import(
        /* webpackChunkName: "practice-builder" */ './practice-lab/practice/practice-builder/pbuilder'
      ).then((m) => m.Pbuilder),
  },
  {
    path: 'practice-instructions/:testId',
    loadComponent: () =>
      import(
        /* webpackChunkName: "practice-instructions" */ './practice-lab/practice/practice-instructions/pinstructions'
      ).then((m) => m.Pinstructions),
  },
  {
    path: 'practice-interface/:testId/:attemptId',
    loadComponent: () =>
      import(
        /* webpackChunkName: "practice-interface" */ './practice-lab/practice/practice-interface/pinterface'
      ).then((m) => m.Pinterface),
  },
  {
    path: 'practice-results',
    loadComponent: () =>
      import(
        /* webpackChunkName: "practice-results" */ './practice-lab/practice/practice-results/practice-results'
      ).then((m) => m.PracticeResults),
  },
  {
    path: 'practice-analysis/:id',
    loadComponent: () =>
      import('./practice-lab/previous-practice/previous-practice').then((m) => m.PreviousPractice),
  },
  {
    path: 'previous-practice-tests',
    loadComponent: () =>
      import('./practice-lab/previous-practice-list/previous-practice-list').then(
        (m) => m.PreviousPracticeList,
      ),
  },
];
