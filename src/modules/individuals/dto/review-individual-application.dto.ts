import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectIndividualApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RequestChangesIndividualApplicationDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
