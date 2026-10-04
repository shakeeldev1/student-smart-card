import { IsString, MinLength } from 'class-validator';

export class SetupEmployeeAccountDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
