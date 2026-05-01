import { Injectable } from '@angular/core';
import { db } from '../database/app.database';
import type { Expense } from '../models/expense.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  constructor(private auth: AuthService) {}

  async getAll(): Promise<Expense[]> {
    return db.expenses.where('userId').equals(this.auth.getUserId()).toArray();
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const userId = this.auth.getUserId();
    return db.expenses
      .where('userId')
      .equals(userId)
      .and(e => e.date >= startDate && e.date <= endDate)
      .toArray();
  }

  async getById(id: number): Promise<Expense | undefined> {
    return db.expenses.get(id);
  }

  async add(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date().toISOString();
    return db.expenses.add({
      ...expense,
      createdAt: now,
      updatedAt: now,
    } as Expense);
  }

  async update(id: number, changes: Partial<Expense>): Promise<void> {
    await db.expenses.update(id, { ...changes, updatedAt: new Date().toISOString() });
  }

  async delete(id: number): Promise<void> {
    await db.expenses.delete(id);
  }

  async search(query: string): Promise<Expense[]> {
    const userId = this.auth.getUserId();
    const lowerQuery = query.toLowerCase();
    return db.expenses
      .where('userId')
      .equals(userId)
      .and(e => e.description.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  async getTotalByDateRange(startDate: string, endDate: string): Promise<number> {
    const expenses = await this.getByDateRange(startDate, endDate);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  async getByCategory(categoryId: number): Promise<Expense[]> {
    const userId = this.auth.getUserId();
    return db.expenses
      .where('[userId+categoryId]')
      .equals([userId, categoryId])
      .toArray()
      .catch(() =>
        db.expenses
          .where('userId')
          .equals(userId)
          .and(e => e.categoryId === categoryId)
          .toArray()
      );
  }
}
