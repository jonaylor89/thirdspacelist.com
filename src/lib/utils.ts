import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}

export function formatWorkabilityScore(score: number | null): string {
  if (score === null) return 'No data'
  return `${Math.round(score * 100)}%`
}

export function getWorkabilityColor(score: number | null): string {
  if (score === null) return '#6b7280' // gray
  if (score >= 0.8) return '#10b981' // green
  if (score >= 0.6) return '#f59e0b' // yellow
  if (score >= 0.4) return '#f97316' // orange
  return '#ef4444' // red
}
