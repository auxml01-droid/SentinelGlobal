export function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Há ${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}

export function timeAgo(timestamp: string): string {
  return formatEventTime(timestamp);
}

export function isWithinTimeRange(
  timestamp: string,
  rangeMinutes: number,
): boolean {
  const date = new Date(timestamp);
  const now = new Date();
  return now.getTime() - date.getTime() <= rangeMinutes * 60 * 1000;
}
