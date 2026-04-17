// Author: E.Kaeith Emmanuel
import { createAction, props } from '@ngrx/store';

// Dispatched by builder.ts after generateTest() responds.
// testData contains mapped InterfaceQuestion[] + metadata.
export const createTest = createAction('[Test] Create Test', props<{ testData: any }>());

// Dispatched by interface.ts per answer selection.
export const saveAnswer = createAction(
  '[Test] Save Answer',
  props<{ index: number; answer: any }>(),
);

// Dispatched by interface.ts after startAttempt() responds.
// Stored so the results page can navigate to the right attempt.
export const setAttemptId = createAction('[Test] Set Attempt ID', props<{ attemptId: number }>());

export const clearTest = createAction('[Test] Clear Test');

export const markForReview = createAction('[Test] Mark Review', props<{ index: number }>());

// Dispatched by interface.ts to mark state as submitted.
// Actual scoring is done server-side — no local score calculation.
export const submitTest = createAction('[Test] Submit Test');

export const setTimer = createAction('[Test] Set Timer', props<{ timeLeft: number }>());

// Dispatched every second to increment time spent on current question.
export const tickQuestion = createAction('[Test] Tick Question', props<{ index: number }>());
