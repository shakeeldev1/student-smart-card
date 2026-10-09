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
   * A company account (corporate). Self-registers, is approved by an operator
   * (like a school), then enrolls its employees — mirroring the school flow.
   */
  CORPORATE = 'corporate',
  /**
   * An employee enrolled by their company. Gets a login at approval and the
   * same Takaful card/certificate as a student.
   */
  EMPLOYEE = 'employee',
  /**
   * Geographic oversight accounts, provisioned by an admin and scoped to a
   * single province / region / district / tehsil. They see aggregate, area-
   * limited analytics (schools + counts) only — never student personal data.
   * The exact area is stored on the `area_managers` row for the user, not in
   * the JWT, so scope changes take effect immediately.
   */
  AREA_MANAGER = 'area_manager',
  /**
   * Super administrator / IT oversight account. A superuser: the RolesGuard
   * lets it pass every @Roles() check, so it can open and track all internal
   * oversight dashboards (Admin, EFU, Operations). Not tied to any entity
   * record; assigned deliberately by an admin.
   */
  SUPER_ADMIN = 'super_admin',
}
