export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringExpense {
  id?: number;
  userId: number;
  amount: number;
  categoryId: number;
  description: string;
  frequency: RecurringFrequency;
  startDate: string; // ISO YYYY-MM-DD
  endDate?: string;  // ISO YYYY-MM-DD, optional
  lastGeneratedDate?: string; // last date entries were generated up to
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
