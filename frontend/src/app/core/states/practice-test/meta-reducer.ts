//Author : E.Kaeith Emmanuel
import { localStorageSync } from 'ngrx-store-localstorage';

export function localStorageSyncReducer(reducer: any) {
  return localStorageSync({
    keys: ['practice'],
    rehydrate: true,
  })(reducer);
}
