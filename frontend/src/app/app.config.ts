import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { testReducer } from './core/states/custom-test/test.reducer';
import { provideToastr } from 'ngx-toastr';
import { testBuilderReducer } from './core/states/sme-test/sme-test.reducer';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { sessionStorageSyncReducer } from './core/states/custom-test/meta-reducer';
import { AuthService } from './core/services/auth/auth.service';
import { catchError, of, tap } from 'rxjs';

// ✅ Runs once before app loads — restores user from cookie silently
function initAuth(authService: AuthService) {
  return () => authService.initAuth().pipe(
    tap((res) => console.log('APP_INITIALIZER refresh response:', JSON.stringify(res))),
    catchError((err) => {
      console.log('APP_INITIALIZER refresh failed — no valid cookie:', err.status);
      return of(null);
    })
  );
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
      }),
    ),
    provideStore(
      {
        //Author : E.Kaeith Emmanuel
        test: testReducer,
        smetestBuilder: testBuilderReducer,
      },
      {
        metaReducers: [sessionStorageSyncReducer],
      },
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideEffects(),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideToastr({
      positionClass: 'toast-top-right',
      timeOut: 2000,
      closeButton: true,
      progressBar: true,
    }),
    // ✅ Restore user from cookie before any route/guard runs
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true
    }
  ],
};
