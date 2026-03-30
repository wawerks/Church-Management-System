import type { Role } from "@/generated/prisma/enums";

/**
 * Role matrix (current product rules):
 * - ADMIN: full access + user management
 * - PASTOR: view-only (no mutations / no exports)
 * - STAFF: members, attendance, donations/expenses/tithes mutations, report exports
 * - TREASURER: donations/expenses/tithes mutations + financial reports, view-only elsewhere
 */

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

/** Create / edit / delete members */
export function canMutateMembers(role: Role) {
  return role === "ADMIN" || role === "STAFF";
}

export function isPastor(role: Role) {
  return role === "PASTOR";
}

/** Mark or save attendance */
export function canMarkAttendance(role: Role) {
  return role === "ADMIN" || role === "STAFF";
}

/** Create / edit / delete donations */
export function canMutateDonations(role: Role) {
  return role === "ADMIN" || role === "STAFF" || role === "TREASURER";
}

/** View events list (read-only for Pastor; Staff uses attendance picker only) */
export function canViewEventsPage(role: Role) {
  return role === "ADMIN" || role === "PASTOR" || role === "TREASURER";
}

/** Create / edit / delete events */
export function canMutateEvents(role: Role) {
  return role === "ADMIN";
}

export function canAccessDonationsPage(role: Role) {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF" || role === "TREASURER";
}

export function canAccessReportsPage(role: Role) {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF" || role === "TREASURER";
}

/** Download financial report files */
export function canExportFinancialReports(role: Role) {
  return role === "ADMIN" || role === "STAFF" || role === "TREASURER";
}

/** Download attendance report files */
export function canExportAttendanceReports(role: Role) {
  return role === "ADMIN" || role === "STAFF";
}

export function canViewDashboardDonations(role: Role) {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF" || role === "TREASURER";
}

/** Admin can void financial rows immediately; others submit a request first. */
export function canVoidFinancialDirectly(role: Role) {
  return role === "ADMIN";
}

/** Submit a void proposal that requires admin approval. */
export function canRequestFinancialVoid(role: Role) {
  return role === "STAFF" || role === "TREASURER";
}
