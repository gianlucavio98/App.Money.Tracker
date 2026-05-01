import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartConfiguration, Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ExpenseService } from '../../services/expense.service';
import { CategoryService } from '../../services/category.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { I18nService } from '../../services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CategoryMultiselectComponent } from '../category-multiselect/category-multiselect.component';
import { DateRange, GroupBy, DATE_RANGE_LABELS, GROUP_BY_LABELS, ALLOWED_GROUPINGS } from '../../models/report-filters.model';
import type { Expense } from '../../models/expense.model';
import type { Category } from '../../models/category.model';

Chart.register(...registerables, ChartDataLabels);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, CategoryMultiselectComponent, TranslatePipe],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit {
  @ViewChild('analyticsContent') analyticsContent!: ElementRef;

  groupBy = GroupBy.Daily;
  selectedRange = DateRange.ThisMonth;
  customStartDate = '';
  customEndDate = '';
  filterCategories: number[] = [];

  // Expose enums and lookups to template
  readonly DateRange = DateRange;
  readonly GroupBy = GroupBy;
  readonly dateRangeLabels = DATE_RANGE_LABELS;
  readonly groupByLabels = GROUP_BY_LABELS;
  readonly dateRangeOptions = Object.values(DateRange);
  readonly groupByOptions = Object.values(GroupBy);

  categories = signal<Category[]>([]);
  expenses = signal<Expense[]>([]);
  totalSpent = signal(0);
  exporting = signal(false);

  // Analytics signals
  avgPerEntry = signal(0);
  avgDailySpending = signal(0);
  topExpenses = signal<(Expense & { categoryName: string; categoryColor: string })[]>([]);
  categoryBreakdown = signal<{ name: string; color: string; amount: number; pct: number; count: number }[]>([]);
  dayOfWeekData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  trendChartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  categoryChartData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  comparisonChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });

  trendOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      datalabels: { display: false },
    },
    scales: { y: { beginAtZero: true } },
  };

  categoryOptions: ChartConfiguration<'doughnut'>['options'] = {
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

  comparisonOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { datalabels: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  dayOfWeekOptions: ChartConfiguration<'bar'>['options'] = {
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
    private pdfService: PdfExportService,
    public i18n: I18nService
  ) {}

  async ngOnInit(): Promise<void> {
    this.categories.set(await this.categoryService.getAll());
    await this.loadReport();
  }

  async loadReport(): Promise<void> {
    const { start, end } = this.getReportRange();
    let expenses = await this.expenseService.getByDateRange(start, end);
    if (this.filterCategories.length > 0) {
      expenses = expenses.filter(e => this.filterCategories.includes(e.categoryId));
    }
    this.expenses.set(expenses);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    this.totalSpent.set(total);

    // Analytics
    this.avgPerEntry.set(expenses.length > 0 ? total / expenses.length : 0);

    const uniqueDays = new Set(expenses.map(e => e.date)).size;
    this.avgDailySpending.set(uniqueDays > 0 ? total / uniqueDays : 0);

    // Top 5 expenses
    const cats = this.categories();
    const sorted = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
    this.topExpenses.set(sorted.map(e => {
      const cat = cats.find(c => c.id === e.categoryId);
      return { ...e, categoryName: cat ? this.i18n.categoryName(cat) : this.i18n.t('common.unknown'), categoryColor: cat?.color ?? '#6c757d' };
    }));

    // Category breakdown table
    const catTotals = new Map<number, { amount: number; count: number }>();
    for (const e of expenses) {
      const cur = catTotals.get(e.categoryId) ?? { amount: 0, count: 0 };
      cur.amount += e.amount;
      cur.count++;
      catTotals.set(e.categoryId, cur);
    }
    const breakdown = [...catTotals.entries()]
      .map(([catId, v]) => {
        const cat = cats.find(c => c.id === catId);
        return {
          name: cat ? this.i18n.categoryName(cat) : this.i18n.t('common.unknown'),
          color: cat?.color ?? '#6c757d',
          amount: Math.round(v.amount * 100) / 100,
          pct: total > 0 ? Math.round((v.amount / total) * 1000) / 10 : 0,
          count: v.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);
    this.categoryBreakdown.set(breakdown);

    this.buildTrendChart(expenses);
    this.buildCategoryChart(expenses);
    this.buildComparisonChart(expenses);
    this.buildDayOfWeekChart(expenses);
  }

  private formatLocalDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getReportRange(): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (this.selectedRange) {
      case DateRange.ThisMonth:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case DateRange.LastMonth:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case DateRange.Last3Months:
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case DateRange.Last6Months:
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case DateRange.ThisYear:
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case DateRange.LastYear:
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case DateRange.Custom:
        return { start: this.customStartDate, end: this.customEndDate };
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }

    return { start: this.formatLocalDate(start), end: this.formatLocalDate(end) };
  }

  buildTrendChart(expenses: Expense[]): void {
    const groups = new Map<string, number>();

    for (const e of expenses) {
      const key = this.getGroupKey(e.date);
      groups.set(key, (groups.get(key) ?? 0) + e.amount);
    }

    const sortedKeys = [...groups.keys()].sort();
    this.trendChartData.set({
      labels: sortedKeys,
      datasets: [{
        data: sortedKeys.map(k => Math.round((groups.get(k) ?? 0) * 100) / 100),
        label: this.i18n.t('analytics.spending'),
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.1)',
        fill: true,
        tension: 0.3,
      }],
    });
  }

  buildCategoryChart(expenses: Expense[]): void {
    const cats = this.categories();
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
  }

  buildComparisonChart(expenses: Expense[]): void {
    const cats = this.categories();
    const groups = new Map<string, Map<number, number>>();

    for (const e of expenses) {
      const key = this.getGroupKey(e.date);
      if (!groups.has(key)) groups.set(key, new Map());
      const catMap = groups.get(key)!;
      catMap.set(e.categoryId, (catMap.get(e.categoryId) ?? 0) + e.amount);
    }

    const sortedKeys = [...groups.keys()].sort();
    const usedCatIds = new Set<number>();
    for (const e of expenses) usedCatIds.add(e.categoryId);

    const datasets = [...usedCatIds].map(catId => {
      const cat = cats.find(c => c.id === catId);
      return {
        label: cat ? this.i18n.categoryName(cat) : this.i18n.t('common.unknown'),
        data: sortedKeys.map(k => Math.round((groups.get(k)?.get(catId) ?? 0) * 100) / 100),
        backgroundColor: cat?.color ?? '#6c757d',
      };
    });

    this.comparisonChartData.set({ labels: sortedKeys, datasets });
  }

  buildDayOfWeekChart(expenses: Expense[]): void {
    const dayKeys = ['days.sunday', 'days.monday', 'days.tuesday', 'days.wednesday', 'days.thursday', 'days.friday', 'days.saturday'];
    const dayNames = dayKeys.map(k => this.i18n.t(k));
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);

    for (const e of expenses) {
      const d = new Date(e.date + 'T00:00:00');
      const day = d.getDay();
      dayTotals[day] += e.amount;
      dayCounts[day]++;
    }

    const avgPerDay = dayTotals.map((total, i) => dayCounts[i] > 0 ? Math.round((total / dayCounts[i]) * 100) / 100 : 0);

    this.dayOfWeekData.set({
      labels: dayNames,
      datasets: [{
        data: avgPerDay,
        backgroundColor: ['#ff6384', '#ff9f40', '#ffcd56', '#4bc0c0', '#36a2eb', '#9966ff', '#c9cbcf'],
        label: this.i18n.t('analytics.avgSpending'),
      }],
    });
  }

  private getGroupKey(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    switch (this.groupBy) {
      case GroupBy.Daily:
        return dateStr.slice(0, 10);
      case GroupBy.Weekly: {
        const start = new Date(d);
        start.setDate(start.getDate() - start.getDay());
        return this.formatLocalDate(start);
      }
      case GroupBy.Monthly:
        return dateStr.slice(0, 7);
      case GroupBy.Yearly:
        return dateStr.slice(0, 4);
    }
  }

  get allowedGroupings(): Set<GroupBy> {
    return ALLOWED_GROUPINGS[this.selectedRange];
  }

  onRangeChange(): void {
    const allowed = this.allowedGroupings;
    if (!allowed.has(this.groupBy)) {
      if (allowed.has(GroupBy.Monthly)) this.groupBy = GroupBy.Monthly;
      else this.groupBy = GroupBy.Weekly;
    }
    this.loadReport();
  }

  onGroupByChange(): void {
    this.buildTrendChart(this.expenses());
    this.buildCategoryChart(this.expenses());
    this.buildComparisonChart(this.expenses());
    this.buildDayOfWeekChart(this.expenses());
  }

  onCategoryFilterChange(ids: number[]): void {
    this.filterCategories = ids;
    this.loadReport();
  }

  clearFilters(): void {
    this.selectedRange = DateRange.ThisMonth;
    this.customStartDate = '';
    this.customEndDate = '';
    this.filterCategories = [];
    this.groupBy = GroupBy.Daily;
    this.loadReport();
  }

  async exportPdf(): Promise<void> {
    this.exporting.set(true);
    try {
      const { start, end } = this.getReportRange();
      await this.pdfService.exportReports(
        this.expenses(),
        this.categories(),
        this.totalSpent(),
        start,
        end,
        this.groupBy,
        this.analyticsContent?.nativeElement
      );
    } finally {
      this.exporting.set(false);
    }
  }
}
