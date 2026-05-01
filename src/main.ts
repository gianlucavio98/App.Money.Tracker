import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { isDevMode } from '@angular/core';

if (isDevMode()) {
  import('./app/database/app.database').then((m) => {
    (window as any).seedDatabase = m.seedDatabase;
  });
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
