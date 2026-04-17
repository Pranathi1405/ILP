import { createReducer, on } from '@ngrx/store';
import * as BuilderActions from './sme-test.actions';
import { TestBuilderState, initialState } from './sme-test.models';

export const testBuilderFeatureKey = 'testBuilder';

export const testBuilderReducer = createReducer<TestBuilderState>(
  initialState(),

  on(BuilderActions.setTitle, (state, { title }) => ({
    ...state,
    testTitle: title,
  })),

  on(BuilderActions.setSubjects, (state, { subjects }) => ({
    ...state,
    selectedSubjects: subjects,
  })),

  on(BuilderActions.setMode, (state, { mode }) => ({
    ...state,
    mode,
  })),

  on(BuilderActions.setTotalQuestions, (state, { total }) => ({
    ...state,
    totalQuestions: total,
  })),

  on(BuilderActions.setDuration, (state, { duration }) => ({
    ...state,
    estimatedDuration: duration,
  })),

  on(BuilderActions.updateCurrentQuestion, (state, { question }) => ({
    ...state,
    currentQuestion: question,
  })),

  on(BuilderActions.addManualQuestion, (state, { question }) => ({
    ...state,
    manualQuestions: [...state.manualQuestions, question],
  })),

  on(BuilderActions.nextStep, (state) => ({
    ...state,
    currentStep: Math.min(state.currentStep + 1, state.totalSteps),
  })),

  on(BuilderActions.previousStep, (state) => ({
    ...state,
    currentStep: Math.max(state.currentStep - 1, 1),
  })),

  on(BuilderActions.resetBuilder, () => initialState()),
);
