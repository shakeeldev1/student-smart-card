import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

/**
 * Roles an admin may create directly as a standalone login. Entity-backed
 * roles (school/corporate/individual/employee/student) are intentionally
 * excluded — they are provisioned through their own registration/enrolment
 * flows that also create the linked record. Area managers keep their own
 * dedicated screen because they need an area scope.
 */
export const ADMIN_CREATABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
  UserRole.EFU,
] as const;

export class CreateStaffUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsIn(ADMIN_CREATABLE_ROLES as unknown as string[], {
    message: 'Role must be one of: admin, operator, efu',
  })
  role!: UserRole;
}
