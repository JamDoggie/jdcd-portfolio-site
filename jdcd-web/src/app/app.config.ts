import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideNgtRenderer } from 'angular-three/dom';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNgtRenderer(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ]
};
