import { localStorageSync } from 'ngrx-store-localstorage';

function getSessionStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.sessionStorage;
}

export function sessionStorageSyncReducer(reducer: any) {
  return localStorageSync({
    keys: ['test'],
    rehydrate: true,
    storage: getSessionStorage(),
  })(reducer);
}
