/**
 * ============================================================
 * Safe JSON Parser Utility
 * ------------------------------------------------------------
 * Module  : Shared Utility
 * Author  : Nithyasri
 * Description:
 * Safely parses JSON values from MySQL query results.
 *
 * Problem it solves:
 *   MySQL's mysql2 driver sometimes auto-parses JSON columns
 *   into objects/arrays before your code receives them.
 *   Calling JSON.parse() on an already-parsed object does:
 *     [object Object].toString() → "[object Object]"
 *     JSON.parse("[object Object]") → CRASH
 *
 */

/**
 * Safely parse a value that may be:
 *  - null / undefined           → return fallback
 *  - already an object/array    → return as-is (driver already parsed it)
 *  - a JSON string              → parse and return
 *  - a GROUP_CONCAT string      → wrap in [] then parse (when useGroupConcat=true)
 *
 * @param {*}       val             - The value to parse
 * @param {*}       fallback        - Default value if parsing fails or val is empty
 * @param {boolean} useGroupConcat  - Set true for GROUP_CONCAT results (wraps in [])
 * @returns {*}
 */
export const safeParseJson = (val, fallback = null, useGroupConcat = false) => {
  // 1. Null / undefined → return fallback
  if (val === null || val === undefined) return fallback;

  // 2. Already parsed by the MySQL driver → return as-is
  if (typeof val === 'object') {
    // Ensure arrays are returned as arrays
    if (Array.isArray(val)) return val;
    // Single object wrapped in array if fallback expects array
    if (Array.isArray(fallback)) return [val];
    return val;
  }

  // 3. String → attempt parsing
  if (typeof val === 'string') {
    const trimmed = val.trim();

    // Empty string or corrupted "[object Object]" string → return fallback
    if (!trimmed || trimmed === '[object Object]') return fallback;

    try {
      if (useGroupConcat) {
        // GROUP_CONCAT returns: {"k":"v"},{"k":"v"} — needs wrapping
        const jsonStr = trimmed.startsWith('[') ? trimmed : `[${trimmed}]`;
        return JSON.parse(jsonStr);
      }
      return JSON.parse(trimmed);
    } catch {
      return fallback;
    }
  }

  return fallback;
};