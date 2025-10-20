export function parseDateRange(dateRange: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  const normalized = dateRange.toLowerCase().trim();

  if (normalized === 'last week' || normalized === 'past week') {
    startDate.setDate(now.getDate() - 7);
  } else if (normalized === 'last month' || normalized === 'past month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (normalized === 'last 7 days') {
    startDate.setDate(now.getDate() - 7);
  } else if (normalized === 'last 30 days') {
    startDate.setDate(now.getDate() - 30);
  } else if (normalized === 'last year' || normalized === 'past year') {
    startDate.setFullYear(now.getFullYear() - 1);
  } else if (normalized === 'today') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (normalized === 'yesterday') {
    startDate.setDate(now.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(now.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else {
    startDate.setDate(now.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getCurrentTimestamp(): number {
  return Date.now();
}
