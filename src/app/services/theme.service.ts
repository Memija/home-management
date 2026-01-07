import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';

/** Storage key for user's preferred theme (hm = homemanagement) */
const THEME_STORAGE_KEY = 'hm_theme';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private platformId = inject(PLATFORM_ID);

    /** Current theme preference */
    readonly currentTheme = signal<Theme>(this.getStoredTheme());

    /** Resolved theme (light or dark based on system preference if 'system' is selected) */
    readonly resolvedTheme = signal<'light' | 'dark'>(this.resolveTheme(this.getStoredTheme()));

    private mediaQuery: MediaQueryList | null = null;

    constructor() {
        if (this.isBrowser) {
            // Setup media query listener for system preference changes
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));

            // Apply initial theme
            this.applyTheme(this.resolvedTheme());
        }
    }

    private get isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    /**
     * Get stored theme preference from localStorage
     */
    private getStoredTheme(): Theme {
        if (!this.isBrowser) return 'light';

        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }

        // Default to system preference
        return 'system';
    }

    /**
     * Resolve the actual theme based on preference and system settings
     */
    private resolveTheme(theme: Theme): 'light' | 'dark' {
        if (theme === 'system') {
            if (!this.isBrowser) return 'light';
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    }

    /**
     * Handle system theme preference changes
     */
    private handleSystemThemeChange(event: MediaQueryListEvent): void {
        if (this.currentTheme() === 'system') {
            const resolved = event.matches ? 'dark' : 'light';
            this.resolvedTheme.set(resolved);
            this.applyTheme(resolved);
        }
    }

    /**
     * Apply theme to the document
     */
    private applyTheme(theme: 'light' | 'dark'): void {
        if (!this.isBrowser) return;

        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Set the theme preference
     */
    setTheme(theme: Theme): void {
        this.currentTheme.set(theme);

        const resolved = this.resolveTheme(theme);
        this.resolvedTheme.set(resolved);
        this.applyTheme(resolved);

        if (this.isBrowser) {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme(): void {
        const current = this.resolvedTheme();
        this.setTheme(current === 'light' ? 'dark' : 'light');
    }
}
