import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

if (typeof process !== 'undefined' && process.env) {
  process.env['NODE_ENV'] = 'test';
}

Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'node.js',
    language: 'en-US',
  },
  writable: true,
  configurable: true,
});

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
