import { TestBed } from '@angular/core/testing';
import { ErrorHandler } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GlobalErrorHandlerService } from './global-error-handler.service';

describe('GlobalErrorHandlerService', () => {
  let service: GlobalErrorHandlerService;
  let superHandleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandlerService],
    });

    service = TestBed.inject(GlobalErrorHandlerService);

    // Spy on the base ErrorHandler so we can assert delegation without triggering
    // Angular's default behaviour (which re-throws and floods the console).
    superHandleErrorSpy = vi
      .spyOn(ErrorHandler.prototype, 'handleError')
      .mockImplementation(() => { });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Browser-extension errors — must be silently suppressed
  // ---------------------------------------------------------------------------

  describe('when error originates from a browser extension', () => {
    const extensionMessages = [
      'Could not establish connection. Receiving end does not exist',
      'Extension context invalidated',
      'The message port closed before a response was received',
    ];

    extensionMessages.forEach((msg) => {
      it(`should silently ignore Error: "${msg}"`, () => {
        service.handleError(new Error(msg));

        expect(superHandleErrorSpy).not.toHaveBeenCalled();
      });

      it(`should silently ignore plain string: "${msg}"`, () => {
        service.handleError(msg);

        expect(superHandleErrorSpy).not.toHaveBeenCalled();
      });

      it(`should silently ignore object with message: "${msg}"`, () => {
        service.handleError({ message: msg });

        expect(superHandleErrorSpy).not.toHaveBeenCalled();
      });
    });

    it('should silently ignore error whose message contains an extension pattern as a substring', () => {
      service.handleError(new Error('Chrome: Extension context invalidated after reload'));

      expect(superHandleErrorSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Real application errors — must be forwarded to the base ErrorHandler
  // ---------------------------------------------------------------------------

  describe('when error is a real application error', () => {
    it('should delegate an unrelated Error instance to super', () => {
      service.handleError(new Error('Something went wrong in the app'));

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
      expect(superHandleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should delegate a plain string error to super', () => {
      service.handleError('Unexpected application failure');

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should delegate a plain object with an unrelated message to super', () => {
      service.handleError({ message: 'Custom error object' });

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should delegate null to super', () => {
      service.handleError(null);

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should delegate undefined to super', () => {
      service.handleError(undefined);

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should delegate a number to super', () => {
      service.handleError(42);

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should delegate an object without a message property to super', () => {
      service.handleError({ code: 500 });

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // extractMessage — edge cases
  // ---------------------------------------------------------------------------

  describe('message extraction edge cases', () => {
    it('should treat a numeric message property as a string when matching', () => {
      // { message: 123 } → extracted as "123" → no extension pattern match → delegate
      service.handleError({ message: 123 });

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should use Error.message over a nested message property', () => {
      // Error instance takes priority via instanceof check
      const err = new Error('App error');
      service.handleError(err);

      expect(superHandleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
