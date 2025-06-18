import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/interceptors/error/error.interceptor';
import { authInterceptor } from './core/interceptors/auth/auth.interceptor';
import { spinnerInterceptor } from './core/interceptors/spinner/spinner.interceptor';
import { provideAnimations } from '@angular/platform-browser/animations'; // This is for animations in ApplicationConfig
import { MatSnackBarModule } from '@angular/material/snack-bar';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),  // For animations instead of BrowserAnimationsModule
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor, spinnerInterceptor])
    ),
    provideRouter(routes),
    importProvidersFrom(MatSnackBarModule)  // Add MatSnackBarModule globally
  ]
};
