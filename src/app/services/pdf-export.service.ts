import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { Expense } from '../models/expense.model';
import type { Category } from '../models/category.model';
import { I18nService } from './i18n.service';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  constructor(private i18n: I18nService) {}

  private getCatName(cat: Category | undefined): string {
    return cat ? this.i18n.categoryName(cat) : this.i18n.t('common.unknown');
  }

  async exportDashboard(
    expenses: Expense[],
    categories: Category[],
    totalSpent: number,
    budget: number,
    startDate: string,
    endDate: string,
    chartElement?: HTMLElement
  ): Promise<void> {
    const doc = new jsPDF();
    const catMap = new Map<number, Category>();
    for (const c of categories) catMap.set(c.id!, c);

    // Title
    doc.setFontSize(20);
    doc.setTextColor(13, 110, 253);
    doc.text(this.i18n.t('pdf.dashboard.title'), 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${this.i18n.t('pdf.common.period')}: ${startDate} ${this.i18n.t('pdf.common.to')} ${endDate}`, 14, 30);
    doc.text(`${this.i18n.t('pdf.common.totalSpent')}: € ${totalSpent.toFixed(2)}`, 14, 37);
    if (budget > 0) {
      doc.text(`${this.i18n.t('pdf.dashboard.budget')}: € ${budget.toFixed(2)} (${((totalSpent / budget) * 100).toFixed(0)}% ${this.i18n.t('pdf.dashboard.used')})`, 14, 44);
    }

    // Category summary
    const catTotals = new Map<number, number>();
    for (const e of expenses) {
      catTotals.set(e.categoryId, (catTotals.get(e.categoryId) ?? 0) + e.amount);
    }

    const summaryData = [...catTotals.entries()].map(([catId, total]) => [
      this.getCatName(catMap.get(catId)),
      `€ ${total.toFixed(2)}`,
      `${((total / totalSpent) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      head: [[this.i18n.t('pdf.common.category'), this.i18n.t('common.amount'), this.i18n.t('pdf.common.pctOfTotal')]],
      body: summaryData,
      startY: budget > 0 ? 52 : 45,
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] },
    });

    // Expenses table
    doc.addPage();
    doc.setFontSize(16);
    doc.text(this.i18n.t('pdf.common.expenseDetails'), 14, 20);

    const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
    const tableData = sortedExpenses.map(e => [
      e.date,
      e.description,
      this.getCatName(catMap.get(e.categoryId)),
      `€ ${e.amount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [[this.i18n.t('common.date'), this.i18n.t('common.description'), this.i18n.t('pdf.common.category'), this.i18n.t('common.amount')]],
      body: tableData,
      startY: 28,
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] },
    });

    // Capture charts if available
    if (chartElement) {
      try {
        const canvas = await html2canvas(chartElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        doc.addPage();
        doc.setFontSize(16);
        doc.text(this.i18n.t('pdf.common.charts'), 14, 20);
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', 14, 28, imgWidth, Math.min(imgHeight, 240));
      } catch {
        // chart capture failed, skip
      }
    }

    doc.save(`expense-report-${startDate}-to-${endDate}.pdf`);
  }

  async exportReports(
    expenses: Expense[],
    categories: Category[],
    totalSpent: number,
    startDate: string,
    endDate: string,
    groupBy: string,
    chartsElement?: HTMLElement
  ): Promise<void> {
    const doc = new jsPDF();
    const catMap = new Map<number, Category>();
    for (const c of categories) catMap.set(c.id!, c);

    // Title
    doc.setFontSize(20);
    doc.setTextColor(13, 110, 253);
    doc.text(this.i18n.t('pdf.analytics.title'), 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${this.i18n.t('pdf.common.period')}: ${startDate} ${this.i18n.t('pdf.common.to')} ${endDate}`, 14, 30);
    doc.text(`${this.i18n.t('pdf.analytics.groupBy')}: ${groupBy}`, 14, 37);
    doc.text(`${this.i18n.t('pdf.common.totalSpent')}: € ${totalSpent.toFixed(2)}`, 14, 44);
    doc.text(`${this.i18n.t('pdf.analytics.entries')}: ${expenses.length}`, 14, 51);
    if (expenses.length > 0) {
      doc.text(`${this.i18n.t('pdf.analytics.avgPerEntry')}: € ${(totalSpent / expenses.length).toFixed(2)}`, 14, 58);
    }

    // Category breakdown
    const catTotals = new Map<number, number>();
    for (const e of expenses) {
      catTotals.set(e.categoryId, (catTotals.get(e.categoryId) ?? 0) + e.amount);
    }
    const summaryData = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([catId, total]) => [
        this.getCatName(catMap.get(catId)),
        `€ ${total.toFixed(2)}`,
        totalSpent > 0 ? `${((total / totalSpent) * 100).toFixed(1)}%` : '0%',
      ]);

    autoTable(doc, {
      head: [[this.i18n.t('pdf.common.category'), this.i18n.t('common.amount'), this.i18n.t('pdf.common.pctOfTotal')]],
      body: summaryData,
      startY: 65,
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] },
    });

    // Expense details
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(this.i18n.t('pdf.common.expenseDetails'), 14, 20);

    const sortedExpenses = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
    const tableData = sortedExpenses.map(e => [
      e.date,
      e.description,
      this.getCatName(catMap.get(e.categoryId)),
      `€ ${e.amount.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [[this.i18n.t('common.date'), this.i18n.t('common.description'), this.i18n.t('pdf.common.category'), this.i18n.t('common.amount')]],
      body: tableData,
      startY: 28,
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] },
    });

    // Charts
    if (chartsElement) {
      try {
        const canvas = await html2canvas(chartsElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        doc.addPage();
        doc.setFontSize(16);
        doc.text(this.i18n.t('pdf.common.charts'), 14, 20);
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', 14, 28, imgWidth, Math.min(imgHeight, 240));
      } catch {
        // chart capture failed, skip
      }
    }

    doc.save(`analytics-${startDate}-to-${endDate}.pdf`);
  }
}
