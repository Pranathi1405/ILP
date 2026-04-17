import { createAction, props } from '@ngrx/store';
import { ManualQuestion, TestMode } from './sme-test.models';

export const setTitle = createAction('[Test Builder] Set Title', props<{ title: string }>());

export const setSubjects = createAction(
  '[Test Builder] Set Subjects',
  props<{ subjects: string[] }>(),
);

export const setMode = createAction('[Test Builder] Set Mode', props<{ mode: TestMode }>());

export const setTotalQuestions = createAction(
  '[Test Builder] Set Total Questions',
  props<{ total: number }>(),
);

export const setDuration = createAction(
  '[Test Builder] Set Duration',
  props<{ duration: number }>(),
);

export const addManualQuestion = createAction(
  '[Test Builder] Add Manual Question',
  props<{ question: ManualQuestion }>(),
);

export const updateCurrentQuestion = createAction(
  '[Test Builder] Update Current Question',
  props<{ question: ManualQuestion }>(),
);

export const nextStep = createAction('[Test Builder] Next Step');
export const previousStep = createAction('[Test Builder] Previous Step');

export const resetBuilder = createAction('[Test Builder] Reset');
