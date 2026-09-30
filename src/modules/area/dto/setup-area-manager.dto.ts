import { IsString, MinLength } from 'class-validator';

export class SetupAreaManagerDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
