// src/utils/formatDateInTz.ts
// Formatte une date dans un fuseau donné (sans React).

export function formatDateInTz(
  date: string | number | Date,
  tz: string = 'Europe/Paris',
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d =
    typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
    ...options,
  }).format(d)
}
