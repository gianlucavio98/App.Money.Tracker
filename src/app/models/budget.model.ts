export interface Budget {
  id?: number;
  userId: number;
  monthlyAmount: number;
  month: string; // YYYY-MM format
}
