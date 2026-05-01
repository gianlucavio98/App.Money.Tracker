import Dexie, { type Table } from 'dexie';
import type { Expense } from '../models/expense.model';
import type { Category } from '../models/category.model';
import type { User } from '../models/user.model';
import type { Budget } from '../models/budget.model';
import type { RecurringExpense } from '../models/recurring-expense.model';

export class AppDatabase extends Dexie {
  expenses!: Table<Expense, number>;
  categories!: Table<Category, number>;
  users!: Table<User, number>;
  budgets!: Table<Budget, number>;
  recurringExpenses!: Table<RecurringExpense, number>;

  constructor() {
    super('MoneyTrackerDB');

    this.version(1).stores({
      expenses: '++id, userId, categoryId, date, recurringExpenseId',
      categories: '++id, name',
      users: '++id, &username',
      budgets: '++id, userId, month, [userId+month]',
      recurringExpenses: '++id, userId, active',
    });
  }
}

export const db = new AppDatabase();

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function seedDatabase(): Promise<void> {
  const userCount = await db.users.count();
  if (userCount === 0) {
    const hash = await hashPassword('MoneyTracking725!?');
    await db.users.add({
      username: 'gianluca.vio',
      passwordHash: hash,
      displayName: 'Gianluca Vio',
      createdAt: new Date().toISOString(),
    });
  }

  // const catCount = await db.categories.count();
  // if (catCount === 0) {
  //   await db.categories.bulkAdd([
  //     { name: 'Food & Groceries', icon: 'bi-cart', color: '#28a745' },
  //     { name: 'Transportation', icon: 'bi-car-front', color: '#007bff' },
  //     { name: 'Entertainment', icon: 'bi-film', color: '#e83e8c' },
  //     { name: 'Housing & Rent', icon: 'bi-house', color: '#6f42c1' },
  //     { name: 'Utilities', icon: 'bi-lightning', color: '#fd7e14' },
  //     { name: 'Healthcare', icon: 'bi-heart-pulse', color: '#dc3545' },
  //     { name: 'Shopping', icon: 'bi-bag', color: '#20c997' },
  //     { name: 'Subscriptions', icon: 'bi-repeat', color: '#6610f2' },
  //     { name: 'Education', icon: 'bi-book', color: '#17a2b8' },
  //     { name: 'Travel', icon: 'bi-airplane', color: '#ffc107' },
  //     { name: 'Personal Care', icon: 'bi-person', color: '#795548' },
  //     { name: 'Other', icon: 'bi-three-dots', color: '#6c757d' },
  //   ]);
  // }
}
