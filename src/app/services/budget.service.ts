import { Injectable } from '@angular/core';
import { db } from '../database/app.database';
import type { Budget } from '../models/budget.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  constructor(private auth: AuthService) {}

  async getForMonth(month: string): Promise<Budget | undefined> {
    const userId = this.auth.getUserId();
    return db.budgets.where({ userId, month }).first();
  }

  async set(month: string, amount: number): Promise<void> {
    const userId = this.auth.getUserId();
    const existing = await this.getForMonth(month);
    if (existing) {
      await db.budgets.update(existing.id!, { monthlyAmount: amount });
    } else {
      await db.budgets.add({ userId, month, monthlyAmount: amount });
    }
  }

  async getAll(): Promise<Budget[]> {
    return db.budgets.where('userId').equals(this.auth.getUserId()).toArray();
  }

  async delete(id: number): Promise<void> {
    await db.budgets.delete(id);
  }
}
