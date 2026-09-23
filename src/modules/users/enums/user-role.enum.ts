export enum UserRole {
  /**
   * Discontinued — no code path creates or authorizes parent accounts any
   * more, and login refuses them. Kept only because the value still exists
   * in the live database enum (and possibly on legacy rows); drop it with a
   * data migration once those rows are cleaned up.
   */
  PARENT = 'parent',
  STUDENT = 'student',
  SCHOOL = 'school',
  OPERATOR = 'operator',
  EFU = 'efu',
  ADMIN = 'admin',
  INDIVIDUAL = 'individual',
}
