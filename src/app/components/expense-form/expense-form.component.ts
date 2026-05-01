import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import type { Category } from '../../models/category.model';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.scss',
})
export class ExpenseFormComponent implements OnInit {
  categories = signal<Category[]>([]);
  isEdit = false;
  expenseId = 0;

  amount = 0;
  categoryId = 0;
  date = new Date().toISOString().split('T')[0];
  description = '';
  saving = signal(false);

  constructor(
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public i18n: I18nService
  ) {}

  async ngOnInit(): Promise<void> {
    this.categories.set(await this.categoryService.getAll());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.expenseId = Number(idParam);
      const expense = await this.expenseService.getById(this.expenseId);
      if (expense) {
        this.amount = expense.amount;
        this.categoryId = expense.categoryId;
        this.date = expense.date;
        this.description = expense.description;
        this.cdr.detectChanges();
      }
    }
  }

  async onSubmit(): Promise<void> {
    this.saving.set(true);
    try {
      if (this.isEdit) {
        await this.expenseService.update(this.expenseId, {
          amount: this.amount,
          categoryId: this.categoryId,
          date: this.date,
          description: this.description,
        });
      } else {
        await this.expenseService.add({
          amount: this.amount,
          categoryId: this.categoryId,
          date: this.date,
          description: this.description,
          userId: this.auth.getUserId(),
        });
      }
      this.router.navigate(['/expenses']);
    } finally {
      this.saving.set(false);
    }
  }
}
