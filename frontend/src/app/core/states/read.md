# States (NgRx)

## Purpose

This folder manages global application state using NgRx.

State management ensures:

- Predictable data flow
- Centralized state
- Easy debugging
- Scalability

## Structure

states/
├── appstate.ts
├── test/
│ ├── test.actions.ts
│ ├── test.reducer.ts
│ ├── test.selectors.ts
│ └── test.state.ts
└── auth/
├── auth.actions.ts
├── auth.reducer.ts
├── auth.selectors.ts
└── auth.state.ts

## Core Concepts

- Actions → Describe what happened
- Reducers → Update state
- Selectors → Read state
- Effects → Handle async operations

## Why Important?

NgRx:

- Makes complex apps manageable
- Prevents inconsistent state
- Enables time-travel debugging
- Improves large-scale maintainability

## Best Practices

- Keep state minimal
- Never mutate state directly
- Use selectors instead of direct state access
- Keep reducers pure
