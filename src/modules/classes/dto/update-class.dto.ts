import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;
}
