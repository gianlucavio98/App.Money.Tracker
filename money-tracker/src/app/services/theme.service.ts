import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'app-theme';
  readonly theme = signal<Theme>(this.loadTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle(): void {
    const next: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.applyTheme(next);
    localStorage.setItem(this.STORAGE_KEY, next);
  }

  private loadTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }
}
