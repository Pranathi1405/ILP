import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TestBuilderState } from './sme-test.models';
import { testBuilderFeatureKey } from './sme-test.reducer';

export const selectTestBuilderState =
  createFeatureSelector<TestBuilderState>(testBuilderFeatureKey);

export const selectTitle = createSelector(selectTestBuilderState, (state) => state.testTitle);

export const selectSubjects = createSelector(
  selectTestBuilderState,
  (state) => state.selectedSubjects,
);

export const selectMode = createSelector(selectTestBuilderState, (state) => state.mode);

export const selectTotalQuestions = createSelector(
  selectTestBuilderState,
  (state) => state.totalQuestions,
);

export const selectDuration = createSelector(
  selectTestBuilderState,
  (state) => state.estimatedDuration,
);

export const selectManualQuestions = createSelector(
  selectTestBuilderState,
  (state) => state.manualQuestions,
);

export const selectCurrentQuestion = createSelector(
  selectTestBuilderState,
  (state) => state.currentQuestion,
);

export const selectCurrentStep = createSelector(
  selectTestBuilderState,
  (state) => state.currentStep,
);

export const selectAllocations = createSelector(
  selectTestBuilderState,
  (state) => state.allocations,
);
