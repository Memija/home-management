import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeBs from '@angular/common/locales/bs';
import localeSr from '@angular/common/locales/sr';
import localeId from '@angular/common/locales/id';
import localePl from '@angular/common/locales/pl';

// Register locales for DatePipe
registerLocaleData(localeDe);
registerLocaleData(localeBs);
registerLocaleData(localeSr);
registerLocaleData(localeId);
registerLocaleData(localePl);

// Add security warning for users opening the console
console.log(
  '%c🛑 STOP',
  'color: #d32f2f; font-size: 24px; font-weight: bold; font-family: sans-serif;',
);
console.log(
  "%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or hack someone's account, it is a scam and will give them access to your data.",
  'font-size: 14px; font-family: sans-serif;',
);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
