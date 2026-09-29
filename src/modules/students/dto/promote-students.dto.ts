import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class PromoteStudentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  studentIds: string[];

  @IsUUID()
  targetClassId: string;

  // Optional target section within the target class; null clears the section.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  targetSectionId?: string | null;
}
