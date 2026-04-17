// ============================================================
// analyticsHelpers.js
// Shared pure utility functions used across the analytics module.
// Pure functions: same input always gives same output, no side effects.
// ============================================================

import { MASTERY_THRESHOLDS, MASTERY_LEVELS } from '../constants/analyticsTypes.js';

/**
 * Determine the mastery level of a student based on their average score.
 *
 * @param {number} avgScore - Average score (0–100)
 * @returns {string} 'WEAK' | 'AVERAGE' | 'STRONG'
 *
 * @example
 * getMasteryLevel(85) // → 'STRONG'
 * getMasteryLevel(55) // → 'AVERAGE'
 * getMasteryLevel(30) // → 'WEAK'
 */
export const getMasteryLevel = (avgScore) => {
  const score = parseFloat(avgScore) || 0;
  if (score >= MASTERY_THRESHOLDS.AVERAGE_MAX + 1) return MASTERY_LEVELS.STRONG;
  if (score >= MASTERY_THRESHOLDS.WEAK_MAX + 1)    return MASTERY_LEVELS.AVERAGE;
  return MASTERY_LEVELS.WEAK;
};

/**
 * Calculate a new running average when a new value is added.
 * This avoids re-reading all previous values from the database.
 *
 * @param {number} currentAvg   - The current average
 * @param {number} currentCount - How many values are in the current average
 * @param {number} newValue     - The new value being added
 * @returns {number} New average (rounded to 2 decimal places)
 *
 * @example
 * calculateRunningAverage(70, 5, 90) // → 73.33
 */
export const calculateRunningAverage = (currentAvg, currentCount, newValue) => {
  const total     = (parseFloat(currentAvg) * currentCount) + parseFloat(newValue);
  const newCount  = currentCount + 1;
  return parseFloat((total / newCount).toFixed(2));
};

/**
 * Format a date range string for database queries.
 * @param {string} range - '7d', '30d', or '12m'
 * @returns {number} Number of days to subtract from today
 */
export const rangeToDays = (range) => {
  const map = { '7d': 7, '30d': 30, '12m': 365 };
  return map[range] || 7;
};

/**
 * Safely parse a JSON field from the database.
 * MySQL JSON columns can come back as strings or objects.
 *
 * @param {string|object|null} value - The raw DB value
 * @param {*} defaultValue - What to return if parsing fails (default: [])
 * @returns {*} Parsed value or defaultValue
 */
export const safeParseJSON = (value, defaultValue = []) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'object') return value; // Already parsed by mysql2
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
};

/**
 * Format minutes into a human-readable time string.
 *
 * @param {number} totalMinutes
 * @returns {string} e.g. "3h 25m" or "45m"
 *
 * @example
 * formatMinutesToDuration(205) // → "3h 25m"
 * formatMinutesToDuration(45)  // → "45m"
 */
export const formatMinutesToDuration = (totalMinutes) => {
  const minutes = parseInt(totalMinutes) || 0;
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins  = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0)  return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Format a number as Indian Rupee currency string.
 *
 * @param {number|string} amount
 * @returns {string} e.g. "₹1,500.00"
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

/**
 * Calculate a pass rate percentage.
 *
 * @param {number} passed  - Number who passed
 * @param {number} total   - Total attempts
 * @returns {string} e.g. "82.5"
 */
export const calculatePassRate = (passed, total) => {
  if (!total || total === 0) return '0.0';
  return ((passed / total) * 100).toFixed(1);
};

/**
 * Determine urgency of a pending doubt based on hours waiting.
 *
 * @param {number} hoursPending
 * @returns {'low'|'medium'|'high'}
 */
export const getDoubtUrgency = (hoursPending) => {
  if (hoursPending > 48) return 'high';
  if (hoursPending > 24) return 'medium';
  return 'low';
};

/**
 * Get a start date string for a given range.
 * Returns a MySQL-compatible date string.
 *
 * @param {string} range - '7d', '30d', or '12m'
 * @returns {string} ISO date string e.g. "2026-02-13"
 */
export const getRangeStartDate = (range) => {
  const days = rangeToDays(range);
  const date  = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};