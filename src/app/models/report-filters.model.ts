export enum DateRange {
  ThisMonth = 'this-month',
  LastMonth = 'last-month',
  Last3Months = 'last-3-months',
  Last6Months = 'last-6-months',
  ThisYear = 'this-year',
  LastYear = 'last-year',
  Custom = 'custom',
}

export enum GroupBy {
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  [DateRange.ThisMonth]: 'filters.thisMonth',
  [DateRange.LastMonth]: 'filters.lastMonth',
  [DateRange.Last3Months]: 'filters.last3Months',
  [DateRange.Last6Months]: 'filters.last6Months',
  [DateRange.ThisYear]: 'filters.thisYear',
  [DateRange.LastYear]: 'filters.lastYear',
  [DateRange.Custom]: 'filters.customRange',
};

export const GROUP_BY_LABELS: Record<GroupBy, string> = {
  [GroupBy.Daily]: 'filters.day',
  [GroupBy.Weekly]: 'filters.week',
  [GroupBy.Monthly]: 'filters.month',
  [GroupBy.Yearly]: 'filters.year',
};

export const ALLOWED_GROUPINGS: Record<DateRange, Set<GroupBy>> = {
  [DateRange.ThisMonth]: new Set([GroupBy.Daily, GroupBy.Weekly]),
  [DateRange.LastMonth]: new Set([GroupBy.Daily, GroupBy.Weekly]),
  [DateRange.Last3Months]: new Set([GroupBy.Daily, GroupBy.Weekly, GroupBy.Monthly]),
  [DateRange.Last6Months]: new Set([GroupBy.Daily, GroupBy.Weekly, GroupBy.Monthly]),
  [DateRange.ThisYear]: new Set([GroupBy.Daily, GroupBy.Weekly, GroupBy.Monthly, GroupBy.Yearly]),
  [DateRange.LastYear]: new Set([GroupBy.Daily, GroupBy.Weekly, GroupBy.Monthly, GroupBy.Yearly]),
  [DateRange.Custom]: new Set([GroupBy.Daily, GroupBy.Weekly, GroupBy.Monthly, GroupBy.Yearly]),
};
