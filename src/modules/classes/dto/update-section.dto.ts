import { IsString, MaxLength } from 'class-validator';

export class UpdateSectionDto {
  @IsString()
  @MaxLength(50)
  name: string;
}
