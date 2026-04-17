//Author : E.Kaeith Emmanuel
import { createReducer, on } from '@ngrx/store';
import { PracticeState } from './practice.model';
import { addPractice, setActivePractice } from './practice.actions';

export const initialState: PracticeState = {
  practiceTests: [],
  activePractice: null,
};

export const practiceReducer = createReducer(
  initialState,

  on(addPractice, (state, { practice }) => ({
    ...state,
    practiceTests: [...state.practiceTests, practice],
  })),

  on(setActivePractice, (state, { practiceId }) => ({
    ...state,
    activePractice: state.practiceTests.find((p) => p.id === practiceId) || null,
  })),
);
