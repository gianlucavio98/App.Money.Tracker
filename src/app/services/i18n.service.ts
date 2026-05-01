import { Injectable, signal } from '@angular/core';
import { en } from '../i18n/en';
import { it } from '../i18n/it';
import type { Category } from '../models/category.model';

export type Lang = 'en' | 'it';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly STORAGE_KEY = 'app-lang';
  readonly supportedLangs: Lang[] = ['en', 'it'];
  readonly lang = signal<Lang>(this.loadLang());

  private translations: Record<string, Record<string, any>> = { en, it };

  t(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let value: any = this.translations[this.lang()];
    for (const part of parts) {
      value = value?.[part];
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(params[k] ?? `{{${k}}}`));
    }
    return value;
  }

  categoryName(cat: Category): string {
    const lang = this.lang();
    if (lang === 'en' || !cat.translations?.[lang]) return cat.name;
    return cat.translations[lang];
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }

  toggleLang(): void {
    this.setLang(this.lang() === 'en' ? 'it' : 'en');
  }

  private loadLang(): Lang {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'en' || stored === 'it') return stored;
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'it' ? 'it' : 'en';
  }
}
