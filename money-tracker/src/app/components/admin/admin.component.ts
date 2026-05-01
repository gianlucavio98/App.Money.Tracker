import { Component, ElementRef, HostListener, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { BudgetService } from '../../services/budget.service';
import { RecurringExpenseService } from '../../services/recurring-expense.service';
import { AuthService } from '../../services/auth.service';
import { db } from '../../database/app.database';
import { CategoryMultiselectComponent } from '../category-multiselect/category-multiselect.component';
import { CategorySelectComponent } from '../category-select/category-select.component';
import { I18nService } from '../../services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BOOTSTRAP_ICONS } from '../../data/bootstrap-icons';
import type { Category } from '../../models/category.model';
import type { Budget } from '../../models/budget.model';
import type { RecurringExpense } from '../../models/recurring-expense.model';
import type { User } from '../../models/user.model';
import type { Expense } from '../../models/expense.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, CategoryMultiselectComponent, CategorySelectComponent, TranslatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  activeTab = 'categories';

  // Categories
  categories = signal<Category[]>([]);
  editingCategory: Category | null = null;
  newCategoryName = '';
  newCategoryNameIt = '';
  newCategoryIcon = 'bi-tag';
  newCategoryColor = '#6c757d';

  // Icon picker
  readonly allIcons = BOOTSTRAP_ICONS;
  iconPickerSearch = '';
  showNewIconDropdown = false;
  showEditIconDropdown = false;

  get filteredIcons() {
    if (!this.iconPickerSearch.trim()) return this.allIcons.slice(0, 60);
    const q = this.iconPickerSearch.toLowerCase();
    return this.allIcons.filter(i => i.label.toLowerCase().includes(q) || i.class.toLowerCase().includes(q)).slice(0, 80);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showNewIconDropdown = false;
    this.showEditIconDropdown = false;
  }

  openNewIconPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.showNewIconDropdown = !this.showNewIconDropdown;
    this.showEditIconDropdown = false;
    this.iconPickerSearch = '';
  }

  openEditIconPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.showEditIconDropdown = !this.showEditIconDropdown;
    this.showNewIconDropdown = false;
    this.iconPickerSearch = '';
  }

  selectNewIcon(cls: string): void {
    this.newCategoryIcon = cls;
    this.showNewIconDropdown = false;
    this.iconPickerSearch = '';
  }

  selectEditIcon(cls: string): void {
    if (this.editingCategory) this.editingCategory.icon = cls;
    this.showEditIconDropdown = false;
    this.iconPickerSearch = '';
  }

  stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

  // Budget
  budgets = signal<Budget[]>([]);
  budgetMonth = new Date().toISOString().slice(0, 7);
  budgetAmount = 0;

  // Recurring
  recurringExpenses = signal<RecurringExpense[]>([]);
  newRecurring = {
    amount: 0,
    categoryId: 0,
    description: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  };
  editingRecurring: RecurringExpense | null = null;

  // Users
  users = signal<User[]>([]);

  // Expenses (admin view)
  allExpenses = signal<Expense[]>([]);
  adminSearchQuery = signal('');
  adminFilterCategories = signal<number[]>([]);
  adminFilterStartDate = signal('');
  adminFilterEndDate = signal('');

  filteredAdminExpenses = computed(() => {
    let result = [...this.allExpenses()];
    const q = this.adminSearchQuery().toLowerCase().trim();
    if (q) result = result.filter(e => e.description.toLowerCase().includes(q));
    const cats = this.adminFilterCategories();
    if (cats.length > 0) result = result.filter(e => cats.includes(e.categoryId));
    const start = this.adminFilterStartDate();
    if (start) result = result.filter(e => e.date >= start);
    const end = this.adminFilterEndDate();
    if (end) result = result.filter(e => e.date <= end);
    return result.sort((a, b) => b.date.localeCompare(a.date));
  });

  constructor(
    private categoryService: CategoryService,
    private budgetService: BudgetService,
    private recurringService: RecurringExpenseService,
    private auth: AuthService,
    private el: ElementRef,
    public i18n: I18nService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.categories.set(await this.categoryService.getAll());
    this.budgets.set(await this.budgetService.getAll());
    this.recurringExpenses.set(await this.recurringService.getAll());
    this.users.set(await db.users.toArray());
    this.allExpenses.set(await db.expenses.toArray());
  }

  // --- Categories ---
  async addCategory(): Promise<void> {
    if (!this.newCategoryName.trim()) return;
    const translations: Record<string, string> = {};
    if (this.newCategoryNameIt.trim()) translations['it'] = this.newCategoryNameIt.trim();
    await this.categoryService.add({
      name: this.newCategoryName.trim(),
      translations: Object.keys(translations).length > 0 ? translations : undefined,
      icon: this.newCategoryIcon,
      color: this.newCategoryColor,
    });
    this.newCategoryName = '';
    this.newCategoryNameIt = '';
    this.newCategoryIcon = 'bi-tag';
    this.newCategoryColor = '#6c757d';
    this.categories.set(await this.categoryService.getAll());
  }

  startEditCategory(cat: Category): void {
    this.editingCategory = { ...cat, translations: { ...cat.translations } };
  }

  async saveCategory(): Promise<void> {
    if (!this.editingCategory) return;
    await this.categoryService.update(this.editingCategory.id!, {
      name: this.editingCategory.name,
      translations: this.editingCategory.translations,
      icon: this.editingCategory.icon,
      color: this.editingCategory.color,
    });
    this.editingCategory = null;
    this.categories.set(await this.categoryService.getAll());
  }

  cancelEditCategory(): void {
    this.editingCategory = null;
  }

  async deleteCategory(id: number): Promise<void> {
    if (confirm(this.i18n.t('admin.categories.confirmDelete'))) {
      await this.categoryService.delete(id);
      this.categories.set(await this.categoryService.getAll());
    }
  }

  // --- Budget ---
  async setBudget(): Promise<void> {
    if (this.budgetAmount <= 0 || !this.budgetMonth) return;
    await this.budgetService.set(this.budgetMonth, this.budgetAmount);
    this.budgets.set(await this.budgetService.getAll());
    this.budgetAmount = 0;
  }

  async deleteBudget(id: number): Promise<void> {
    if (confirm(this.i18n.t('admin.budget.confirmDelete'))) {
      await this.budgetService.delete(id);
      this.budgets.set(await this.budgetService.getAll());
    }
  }

  // --- Recurring ---
  async addRecurring(): Promise<void> {
    if (!this.newRecurring.description.trim() || this.newRecurring.amount <= 0 || !this.newRecurring.categoryId) return;
    await this.recurringService.add({
      userId: this.auth.getUserId(),
      amount: this.newRecurring.amount,
      categoryId: this.newRecurring.categoryId,
      description: this.newRecurring.description.trim(),
      frequency: this.newRecurring.frequency,
      startDate: this.newRecurring.startDate,
      endDate: this.newRecurring.endDate || undefined,
      active: true,
    });
    this.newRecurring = {
      amount: 0, categoryId: 0, description: '', frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0], endDate: '',
    };
    this.recurringExpenses.set(await this.recurringService.getAll());
  }

  startEditRecurring(rec: RecurringExpense): void {
    this.editingRecurring = { ...rec };
  }

  async saveRecurring(): Promise<void> {
    if (!this.editingRecurring) return;
    await this.recurringService.update(this.editingRecurring.id!, {
      amount: this.editingRecurring.amount,
      categoryId: this.editingRecurring.categoryId,
      description: this.editingRecurring.description,
      frequency: this.editingRecurring.frequency,
      startDate: this.editingRecurring.startDate,
      endDate: this.editingRecurring.endDate || undefined,
      active: this.editingRecurring.active,
    });
    this.editingRecurring = null;
    this.recurringExpenses.set(await this.recurringService.getAll());
  }

  cancelEditRecurring(): void {
    this.editingRecurring = null;
  }

  async deleteRecurring(id: number): Promise<void> {
    if (confirm(this.i18n.t('admin.recurring.confirmDelete'))) {
      await this.recurringService.delete(id);
      this.recurringExpenses.set(await this.recurringService.getAll());
      this.allExpenses.set(await db.expenses.toArray());
    }
  }

  async toggleRecurringActive(rec: RecurringExpense): Promise<void> {
    await this.recurringService.update(rec.id!, { active: !rec.active });
    this.recurringExpenses.set(await this.recurringService.getAll());
  }

  // --- Expenses admin ---
  async deleteExpense(id: number): Promise<void> {
    if (confirm(this.i18n.t('admin.expenses.confirmDelete'))) {
      await db.expenses.delete(id);
      this.allExpenses.set(await db.expenses.toArray());
    }
  }

  getCategoryName(id: number): string {
    const cat = this.categories().find(c => c.id === id);
    return cat ? this.i18n.categoryName(cat) : this.i18n.t('common.unknown');
  }
}
