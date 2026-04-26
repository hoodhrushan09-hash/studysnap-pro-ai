export function formatDate(dateString: string | null): string {
  if (!dateString) return 'No due date';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  }).format(date);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
