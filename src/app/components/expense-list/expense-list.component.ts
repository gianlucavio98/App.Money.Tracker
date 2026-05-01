import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { CategoryService } from '../../services/category.service';
import { I18nService } from '../../services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CategoryMultiselectComponent } from '../category-multiselect/category-multiselect.component';
import type { Expense } from '../../models/expense.model';
import type { Category } from '../../models/category.model';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CategoryMultiselectComponent, TranslatePipe],
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent implements OnInit {
  allExpenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  categoryMap = computed(() => {
    const map = new Map<number, Category>();
    for (const c of this.categories()) map.set(c.id!, c);
    return map;
  });

  // Filters
  searchQuery = '';
  filterCategories: number[] = [];
  selectedRange = 'this-month';
  customStartDate = '';
  customEndDate = '';
  filterStartDate = '';
  filterEndDate = '';

  // Sorting
  sortField: keyof Expense = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Pagination
  currentPage = 1;
  pageSize = 15;

  filteredExpenses = signal<Expense[]>([]);
  totalPages = computed(() => Math.ceil(this.filteredExpenses().length / this.pageSize));
  pagedExpenses = computed(() => {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredExpenses().slice(start, start + this.pageSize);
  });

  constructor(
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private router: Router,
    public i18n: I18nService
  ) {}

  async ngOnInit(): Promise<void> {
    this.categories.set(await this.categoryService.getAll());
    this.applyDateRange();
    await this.loadExpenses();
  }

  async loadExpenses(): Promise<void> {
    let expenses: Expense[];
    if (this.filterStartDate && this.filterEndDate) {
      expenses = await this.expenseService.getByDateRange(this.filterStartDate, this.filterEndDate);
    } else {
      expenses = await this.expenseService.getAll();
    }
    this.allExpenses.set(expenses);
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allExpenses()];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e => {
        const cat = this.categoryMap().get(e.categoryId);
        return e.description.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q);
      });
    }

    if (this.filterCategories.length > 0) {
      result = result.filter(e => this.filterCategories.includes(e.categoryId));
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[this.sortField];
      const bVal = b[this.sortField];
      if (aVal == null || bVal == null) return 0;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });

    this.filteredExpenses.set(result);
    this.currentPage = 1;
  }

  onSort(field: keyof Expense): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'bi-chevron-expand';
    return this.sortDirection === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }

  getCategoryName(id: number): string {
    return this.categoryMap().get(id)?.name ? this.i18n.categoryName(this.categoryMap().get(id)!) : this.i18n.t('common.unknown');
  }

  getCategoryColor(id: number): string {
    return this.categoryMap().get(id)?.color ?? '#6c757d';
  }

  editExpense(id: number): void {
    this.router.navigate(['/edit-expense', id]);
  }

  async deleteExpense(id: number): Promise<void> {
    if (confirm(this.i18n.t('expenses.confirmDelete'))) {
      await this.expenseService.delete(id);
      await this.loadExpenses();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages()) this.currentPage++;
  }

  private formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyDateRange(): void {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (this.selectedRange) {
      case 'last-7':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case 'last-30':
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this-year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        this.filterStartDate = this.customStartDate;
        this.filterEndDate = this.customEndDate;
        return;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    this.filterStartDate = this.formatLocalDate(start);
    this.filterEndDate = this.formatLocalDate(end);
  }

  onCategoryFilterChange(ids: number[]): void {
    this.filterCategories = ids;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterCategories = [];
    this.selectedRange = 'this-month';
    this.customStartDate = '';
    this.customEndDate = '';
    this.applyDateRange();
    this.loadExpenses();
  }

  onRangeChange(): void {
    this.applyDateRange();
    this.loadExpenses();
  }

  onFilterChange(): void {
    this.loadExpenses();
  }

  onSearchChange(): void {
    this.applyFilters();
  }
}
