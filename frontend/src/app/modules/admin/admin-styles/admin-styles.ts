/**
 * AUTHOR: Umesh Teja Peddi
 * * src/app/modules/admin/admin-styles/admin-styles.ts – Admin Shared Styles
 * =========================================================================
 * Centralized style maps for reuse across admin components.
 *
 * Exports:
 * 1. statusStyles        – Full badge styles (background + text + border) for user status
 * 2. statusSelectorStyles – Text + border only styles for the status dropdown selector
 *
 * Pattern: Record<string, string> keyed by status string → Tailwind class string
 */

export const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-600 border border-green-200',
  SUSPENDED: 'bg-red-50 text-red-500 border border-red-200',
  PENDING: 'bg-amber-50 text-amber-600 border border-amber-200',
  // dropdown hover states
  All: 'text-slate-700 hover:bg-slate-50',
  Active: 'text-green-600 hover:bg-green-50',
  Suspended: 'text-red-500 hover:bg-red-50',
  Pending: 'text-amber-600 hover:bg-amber-50',
};

export const statusSelectorStyles: Record<string, string> = {
  ALL: 'text-slate-600',
  ACTIVE: 'text-green-600 bg-green-50 px-1.5 py-0.5 rounded',
  SUSPENDED: 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded',
  PENDING: 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded',
};
