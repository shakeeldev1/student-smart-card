import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;

  // Only used by ADMIN — a SCHOOL user's own institution is always inferred
  // from their account, never taken from the request body.
  @IsOptional()
  @IsUUID()
  institutionId?: string;
}
