//Author : E.Kaeith Emmanuel
import { createAction, props } from '@ngrx/store';
import { PracticeTest } from './practice.model';

export const addPractice = createAction(
  '[Teacher] Add Practice',
  props<{ practice: PracticeTest }>(),
);

export const setActivePractice = createAction(
  '[Student] Set Active Practice',
  props<{ practiceId: string }>(),
);
