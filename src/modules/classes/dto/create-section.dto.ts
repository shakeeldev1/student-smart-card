import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSectionDto {
  @IsUUID()
  classId: string;

  @IsString()
  @MaxLength(50)
  name: string;
}
