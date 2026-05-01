import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Category } from '../../models/category.model';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-category-multiselect',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="position-relative">
      <button
        type="button"
        class="form-select text-start text-truncate"
        (click)="toggleDropdown($event)"
        [title]="buttonLabel">
        {{ buttonLabel }}
      </button>
      @if (open) {
        <div
          class="dropdown-menu show p-2 w-100"
          style="max-height: 280px; overflow-y: auto; z-index: 1055;"
          (click)="$event.stopPropagation()">
          <input
            type="text"
            class="form-control form-control-sm mb-2"
            [placeholder]="i18n.t('categoryMultiselect.searchPlaceholder')"
            [(ngModel)]="search"
            (ngModelChange)="onSearchChange()" />
          <div class="form-check mb-1">
            <input
              class="form-check-input"
              type="checkbox"
              id="ms-cat-all"
              [checked]="selected.length === 0"
              (change)="clearAll()" />
            <label class="form-check-label fw-semibold" for="ms-cat-all">
              {{ i18n.t('categoryMultiselect.allCategories') }}
            </label>
          </div>
          <hr class="my-1" />
          @for (cat of filteredCategories; track cat.id) {
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                [id]="'ms-cat-' + cat.id"
                [checked]="selected.includes(cat.id!)"
                (change)="toggleCat(cat.id!)" />
              <label class="form-check-label" [for]="'ms-cat-' + cat.id">
                <i class="bi {{ cat.icon }} me-1" [style.color]="cat.color"></i>
                {{ i18n.categoryName(cat) }}
              </label>
            </div>
          }
          @if (filteredCategories.length === 0) {
            <div class="text-muted small px-1">{{ i18n.t('categoryMultiselect.noResults') }}</div>
          }
        </div>
      }
    </div>
  `,
})
export class CategoryMultiselectComponent {
  @Input() categories: Category[] = [];
  @Input() selected: number[] = [];
  @Output() selectedChange = new EventEmitter<number[]>();

  open = false;
  search = '';

  constructor(private el: ElementRef, public i18n: I18nService) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }

  get filteredCategories(): Category[] {
    if (!this.search.trim()) return this.categories;
    const q = this.search.toLowerCase();
    return this.categories.filter(c => this.i18n.categoryName(c).toLowerCase().includes(q));
  }

  get buttonLabel(): string {
    if (this.selected.length === 0) return this.i18n.t('categoryMultiselect.allCategories');
    if (this.selected.length === 1) {
      const cat = this.categories.find(c => c.id === this.selected[0]);
      return cat ? this.i18n.categoryName(cat) : this.i18n.t('categoryMultiselect.oneSelected');
    }
    return this.i18n.t('categoryMultiselect.nSelected', { n: this.selected.length });
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) this.search = '';
  }

  toggleCat(id: number): void {
    const next = this.selected.includes(id)
      ? this.selected.filter(x => x !== id)
      : [...this.selected, id];
    this.selectedChange.emit(next);
  }

  clearAll(): void {
    this.selectedChange.emit([]);
  }

  onSearchChange(): void {}
}
