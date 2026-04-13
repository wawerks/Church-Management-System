import type { Role } from "@/generated/prisma/enums";

export function roleLabel(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "PASTOR":
      return "Pastor";
    case "STAFF":
      return "Staff";
    case "TREASURER":
      return "Treasurer";
    default:
      return role;
  }
}
