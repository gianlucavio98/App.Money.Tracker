import { Injectable } from '@angular/core';
import { db } from '../database/app.database';
import type { RecurringExpense } from '../models/recurring-expense.model';
import { AuthService } from './auth.service';
import { ExpenseService } from './expense.service';

@Injectable({ providedIn: 'root' })
export class RecurringExpenseService {
  constructor(private auth: AuthService, private expenseService: ExpenseService) {}

  async getAll(): Promise<RecurringExpense[]> {
    return db.recurringExpenses.where('userId').equals(this.auth.getUserId()).toArray();
  }

  async getById(id: number): Promise<RecurringExpense | undefined> {
    return db.recurringExpenses.get(id);
  }

  async add(recurring: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt' | 'lastGeneratedDate'>): Promise<number> {
    const now = new Date().toISOString();
    return db.recurringExpenses.add({
      ...recurring,
      lastGeneratedDate: undefined,
      createdAt: now,
      updatedAt: now,
    } as RecurringExpense);
  }

  async update(id: number, changes: Partial<RecurringExpense>): Promise<void> {
    await db.recurringExpenses.update(id, { ...changes, updatedAt: new Date().toISOString() });
  }

  async delete(id: number): Promise<void> {
    await db.recurringExpenses.delete(id);
    // Also delete generated expenses
    await db.expenses.where('recurringExpenseId').equals(id).delete();
  }

  async generateEntries(): Promise<void> {
    const userId = this.auth.getUserId();
    if (!userId) return;

    const recurrings = await db.recurringExpenses
      .where('userId').equals(userId)
      .and(r => r.active)
      .toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const rec of recurrings) {
      const lastGen = rec.lastGeneratedDate ? new Date(rec.lastGeneratedDate) : new Date(rec.startDate);
      lastGen.setHours(0, 0, 0, 0);

      // If this is the first time, start from startDate
      let nextDate: Date;
      if (!rec.lastGeneratedDate) {
        nextDate = new Date(rec.startDate);
      } else {
        nextDate = this.getNextDate(new Date(rec.lastGeneratedDate), rec.frequency);
      }
      nextDate.setHours(0, 0, 0, 0);

      let latestGenerated = rec.lastGeneratedDate;

      while (nextDate <= today) {
        if (rec.endDate && nextDate > new Date(rec.endDate)) break;

        const dateStr = nextDate.toISOString().split('T')[0];

        // Check if already exists
        const existing = await db.expenses
          .where('recurringExpenseId').equals(rec.id!)
          .and(e => e.date === dateStr)
          .first();

        if (!existing) {
          await this.expenseService.add({
            amount: rec.amount,
            categoryId: rec.categoryId,
            date: dateStr,
            description: rec.description,
            userId: rec.userId,
            recurringExpenseId: rec.id,
          });
        }

        latestGenerated = dateStr;
        nextDate = this.getNextDate(nextDate, rec.frequency);
        nextDate.setHours(0, 0, 0, 0);
      }

      if (latestGenerated && latestGenerated !== rec.lastGeneratedDate) {
        await db.recurringExpenses.update(rec.id!, { lastGeneratedDate: latestGenerated });
      }
    }
  }

  private getNextDate(date: Date, frequency: string): Date {
    const next = new Date(date);
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }
}
