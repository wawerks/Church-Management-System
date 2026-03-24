import type { Role } from "@/generated/prisma/enums";

/**
 * Role matrix (current product rules):
 * - ADMIN: full access + user management
 * - PASTOR: view-only (no mutations / no exports)
 * - STAFF: members, attendance, donations, report exports (no events CRUD)
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
  return role === "ADMIN" || role === "STAFF";
}

/** View events list (read-only for Pastor; Staff uses attendance picker only) */
export function canViewEventsPage(role: Role) {
  return role === "ADMIN" || role === "PASTOR";
}

/** Create / edit / delete events */
export function canMutateEvents(role: Role) {
  return role === "ADMIN";
}

export function canAccessDonationsPage(role: Role) {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF";
}

export function canAccessReportsPage(role: Role) {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF";
}

/** Download Excel / PDF / Word */
export function canExportReports(role: Role) {
  return role === "ADMIN" || role === "STAFF";
}

export function canViewDashboardDonations(role: Role) {
  return role === "ADMIN" || role === "PASTOR" || role === "STAFF";
}
