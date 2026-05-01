export interface Expense {
  id?: number;
  amount: number;
  categoryId: number;
  date: string; // ISO date string YYYY-MM-DD
  description: string;
  userId: number;
  recurringExpenseId?: number;
  createdAt: string;
  updatedAt: string;
}
