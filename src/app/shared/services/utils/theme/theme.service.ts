import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemePreference = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme-preference';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly mediaQuery = this.isBrowser ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  private readonly preferenceSubject = new BehaviorSubject<ThemePreference>(this.loadPreference());
  readonly preference$ = this.preferenceSubject.asObservable();

  constructor() {
    this.applyTheme(this.preferenceSubject.value);
    if (this.mediaQuery) {
      this.mediaQuery.addEventListener('change', () => {
        if (this.preferenceSubject.value === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  get currentPreference(): ThemePreference {
    return this.preferenceSubject.value;
  }

  cyclePreference(): void {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    const currentIndex = order.indexOf(this.preferenceSubject.value);
    const nextPreference = order[(currentIndex + 1) % order.length];
    this.updatePreference(nextPreference);
  }

  setPreference(preference: ThemePreference): void {
    this.updatePreference(preference);
  }

  private updatePreference(preference: ThemePreference): void {
    if (this.preferenceSubject.value === preference) {
      return;
    }
    this.preferenceSubject.next(preference);
    this.persistPreference(preference);
    this.applyTheme(preference);
  }

  private loadPreference(): ThemePreference {
    if (!this.isBrowser) {
      return 'system';
    }
    try {
      const stored = localStorage.getItem(this.storageKey) as ThemePreference | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // Ignore storage errors and fall back to system preference.
    }
    return 'system';
  }

  private persistPreference(preference: ThemePreference): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, preference);
    } catch {
      // Ignore storage errors (e.g. private mode).
    }
  }

  private applyTheme(preference: ThemePreference): void {
    const htmlElement = this.document?.documentElement;
    if (!htmlElement) {
      return;
    }

    if (preference === 'system') {
      htmlElement.removeAttribute('data-theme');
      return;
    }

    htmlElement.setAttribute('data-theme', preference);
  }
}
