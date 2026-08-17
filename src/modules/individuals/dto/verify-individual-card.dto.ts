import { IsString } from 'class-validator';

export class VerifyIndividualCardDto {
  @IsString()
  code: string;
}
