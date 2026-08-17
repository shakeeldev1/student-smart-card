import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOwnStudentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  guardianMobile?: string;

  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  guardianAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  guardianCity?: string;
}
