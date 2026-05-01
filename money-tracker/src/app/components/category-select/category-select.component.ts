import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { Category } from '../../models/category.model';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-category-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="position-relative">
      <button
        type="button"
        class="form-select text-start text-truncate"
        [class.form-select-sm]="small"
        (click)="toggleDropdown($event)">
        @if (selectedCategory) {
          <i class="bi {{ selectedCategory.icon }} me-1" [style.color]="selectedCategory.color"></i>
          {{ i18n.categoryName(selectedCategory) }}
        } @else {
          <span class="text-muted">{{ placeholder || i18n.t('categorySelect.defaultPlaceholder') }}</span>
        }
      </button>
      @if (open) {
        <div
          class="dropdown-menu show p-2 w-100"
          style="max-height: 280px; overflow-y: auto; z-index: 1055;"
          (click)="$event.stopPropagation()">
          <input
            type="text"
            class="form-control form-control-sm mb-2"
            [placeholder]="i18n.t('categorySelect.searchPlaceholder')"
            [(ngModel)]="search" />
          @for (cat of filteredCategories; track cat.id) {
            <button
              type="button"
              class="dropdown-item d-flex align-items-center rounded"
              [class.active]="selected === cat.id"
              (click)="select(cat)">
              <i class="bi {{ cat.icon }} me-2" [style.color]="cat.color"></i>
              {{ i18n.categoryName(cat) }}
            </button>
          }
          @if (filteredCategories.length === 0) {
            <div class="text-muted small px-1">{{ i18n.t('categorySelect.noResults') }}</div>
          }
        </div>
      }
    </div>
  `,
})
export class CategorySelectComponent {
  @Input() categories: Category[] = [];
  @Input() selected: number = 0;
  @Input() placeholder = '';
  @Input() small = false;
  @Output() selectedChange = new EventEmitter<number>();

  open = false;
  search = '';

  constructor(private el: ElementRef, public i18n: I18nService) {}

  get selectedCategory(): Category | undefined {
    return this.categories.find(c => c.id === this.selected);
  }

  get filteredCategories(): Category[] {
    const q = this.search.toLowerCase();
    return q ? this.categories.filter(c => this.i18n.categoryName(c).toLowerCase().includes(q)) : this.categories;
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) this.search = '';
  }

  select(cat: Category): void {
    this.selectedChange.emit(cat.id!);
    this.open = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }
}
