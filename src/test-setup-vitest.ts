import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

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

if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
  Blob.prototype.text = function () {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = (event?.target as { result?: string })?.result ?? reader.result;
        resolve((res ?? '') as string);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(this);
    });
  };
}
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = Blob.prototype.text;
}

const createArrayBufferPolyfill = () => {
  return function (this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = (event?.target as { result?: unknown })?.result ?? reader.result;
        if (typeof res === 'string') {
          const buf = new Uint8Array(res.length);
          for (let i = 0; i < res.length; i++) {
            buf[i] = res.charCodeAt(i) & 0xff;
          }
          resolve(buf.buffer);
        } else if (res instanceof ArrayBuffer) {
          resolve(res);
        } else {
          resolve(new ArrayBuffer(0));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(this);
    });
  };
};

if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = createArrayBufferPolyfill();
}
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = Blob.prototype?.arrayBuffer ?? createArrayBufferPolyfill();
}
if (typeof window !== 'undefined') {
  if (window.Blob && !window.Blob.prototype.arrayBuffer) {
    window.Blob.prototype.arrayBuffer = Blob.prototype?.arrayBuffer ?? createArrayBufferPolyfill();
  }
  if (window.File && !window.File.prototype.arrayBuffer) {
    window.File.prototype.arrayBuffer = File.prototype?.arrayBuffer ?? createArrayBufferPolyfill();
  }
}

if (!globalThis.crypto) {
  // @ts-expect-error polyfill crypto in test env
  globalThis.crypto = {};
}
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
    if (!array) return array;
    const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
