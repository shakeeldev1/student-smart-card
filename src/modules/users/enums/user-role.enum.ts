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
  /**
   * Geographic oversight accounts, provisioned by an admin and scoped to a
   * single province / region / district / tehsil. They see aggregate, area-
   * limited analytics (schools + counts) only — never student personal data.
   * The exact area is stored on the `area_managers` row for the user, not in
   * the JWT, so scope changes take effect immediately.
   */
  AREA_MANAGER = 'area_manager',
}
