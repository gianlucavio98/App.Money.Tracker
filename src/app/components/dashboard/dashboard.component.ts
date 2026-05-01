import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ExpenseService } from '../../services/expense.service';
import { CategoryService } from '../../services/category.service';
import { BudgetService } from '../../services/budget.service';
import { RecurringExpenseService } from '../../services/recurring-expense.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { I18nService } from '../../services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CategoryMultiselectComponent } from '../category-multiselect/category-multiselect.component';
import type { Expense } from '../../models/expense.model';
import type { Category } from '../../models/category.model';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, CategoryMultiselectComponent, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  @ViewChild('dashboardContent') dashboardContent!: ElementRef;

  expenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  totalSpent = signal(0);
  budgetAmount = signal(0);
  budgetProgress = signal(0);
  budgetRemaining = signal(0);
  selectedMonth: string;
  selectedCategories: number[] = [];

  // Chart data
  categoryChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  dailyChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  categoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          generateLabels: (chart) => {
            const data = chart.data;
            if (!data.labels || !data.datasets.length) return [];
            const dataset = data.datasets[0];
            const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
            return data.labels.map((label, i) => {
              const value = dataset.data[i] as number;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return {
                text: `${label} (${pct}%)`,
                fillStyle: Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i] as string : '#ccc',
                hidden: false,
                index: i,
              };
            });
          },
        },
      },
      datalabels: {
        color: '#fff',
        font: { weight: 'bold', size: 12 },
        formatter: (value: number) => `€${value.toFixed(2)}`,
        display: (ctx: any) => ctx.dataset.data[ctx.dataIndex] > 0,
      },
    },
  };

  dailyChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: { display: false },
    },
    scales: { y: { beginAtZero: true } },
  };

  constructor(
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private budgetService: BudgetService,
    private recurringService: RecurringExpenseService,
    private pdfService: PdfExportService,
    public i18n: I18nService
  ) {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async ngOnInit(): Promise<void> {
    await this.recurringService.generateEntries();
    this.categories.set(await this.categoryService.getAll());
    await this.loadData();
  }

  async loadData(): Promise<void> {
    const { start, end } = this.getDateRange();
    let expenses = await this.expenseService.getByDateRange(start, end);

    if (this.selectedCategories.length > 0) {
      expenses = expenses.filter(e => this.selectedCategories.includes(e.categoryId));
    }

    this.expenses.set(expenses);
    this.totalSpent.set(expenses.reduce((s, e) => s + e.amount, 0));

    // Budget for the selected month
    const budget = await this.budgetService.getForMonth(this.selectedMonth);
    this.budgetAmount.set(budget?.monthlyAmount ?? 0);
    if (this.budgetAmount() > 0) {
      this.budgetProgress.set(Math.min(100, (this.totalSpent() / this.budgetAmount()) * 100));
      this.budgetRemaining.set(Math.max(0, this.budgetAmount() - this.totalSpent()));
    } else {
      this.budgetProgress.set(0);
      this.budgetRemaining.set(0);
    }

    this.buildCharts(expenses);
  }

  getDateRange(): { start: string; end: string } {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      start: this.formatLocalDate(start),
      end: this.formatLocalDate(end),
    };
  }

  private formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onMonthChange(): void {
    this.loadData();
  }

  onCategoryFilterChange(ids: number[]): void {
    this.selectedCategories = ids;
    this.loadData();
  }

  clearFilters(): void {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.selectedCategories = [];
    this.loadData();
  }

  buildCharts(expenses: Expense[]): void {
    const cats = this.categories();

    // Category doughnut
    const catTotals = new Map<number, number>();
    for (const e of expenses) {
      catTotals.set(e.categoryId, (catTotals.get(e.categoryId) ?? 0) + e.amount);
    }

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];
    for (const [catId, total] of catTotals) {
      const cat = cats.find(c => c.id === catId);
      labels.push(cat ? this.i18n.categoryName(cat) : this.i18n.t('common.unknown'));
      data.push(Math.round(total * 100) / 100);
      colors.push(cat?.color ?? '#6c757d');
    }

    this.categoryChartData.set({
      labels,
      datasets: [{ data, backgroundColor: colors }],
    });

    // Daily bar chart
    const dailyTotals = new Map<string, number>();
    for (const e of expenses) {
      dailyTotals.set(e.date, (dailyTotals.get(e.date) ?? 0) + e.amount);
    }
    const sortedDates = [...dailyTotals.keys()].sort();

    this.dailyChartData.set({
      labels: sortedDates,
      datasets: [{
        data: sortedDates.map(d => Math.round((dailyTotals.get(d) ?? 0) * 100) / 100),
        backgroundColor: '#0d6efd',
        label: this.i18n.t('dashboard.dailySpending'),
      }],
    });
  }

  getBudgetColor(): string {
    const p = this.budgetProgress();
    if (p >= 90) return 'danger';
    if (p >= 70) return 'warning';
    return 'success';
  }

  async exportPdf(): Promise<void> {
    const { start, end } = this.getDateRange();
    await this.pdfService.exportDashboard(
      this.expenses(),
      this.categories(),
      this.totalSpent(),
      this.budgetAmount(),
      start,
      end,
      this.dashboardContent?.nativeElement
    );
  }
}
