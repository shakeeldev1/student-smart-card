import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { GoldenNumbersService } from './golden-numbers.service';

class AssignGoldenDto {
  @IsString()
  cardNumber: string;

  @IsString()
  suffix: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

class SuffixDto {
  @IsString()
  suffix: string;
}

@Controller('admin/golden-numbers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class GoldenNumbersController {
  constructor(private readonly goldenNumbers: GoldenNumbersService) {}

  @Get()
  getOverview() {
    return this.goldenNumbers.getOverview();
  }

  @Get('validate')
  validate(@Query('suffix') suffix: string) {
    return this.goldenNumbers.validate(suffix ?? '');
  }

  @Get('lookup-card')
  lookupCard(@Query('cardNumber') cardNumber: string) {
    return this.goldenNumbers.lookupCard(cardNumber ?? '');
  }

  @Post('assign')
  assign(@CurrentUser('sub') adminId: string, @Body() dto: AssignGoldenDto) {
    return this.goldenNumbers.assign(adminId, dto.cardNumber, dto.suffix, dto.note);
  }

  @Post('unassign')
  unassign(@Body() dto: SuffixDto) {
    return this.goldenNumbers.unassign(dto.suffix);
  }
}
