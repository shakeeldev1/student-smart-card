import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { InstitutionsService } from './institutions.service';
import { RejectInstitutionDto } from './dto/reject-institution.dto';

@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OPERATOR)
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get('me')
  @Roles(UserRole.SCHOOL)
  async findMine(@CurrentUser('sub') ownerUserId: string) {
    const institution =
      await this.institutionsService.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }
    return institution;
  }

  @Get('pending')
  findPending() {
    return this.institutionsService.findPending();
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @CurrentUser('sub') operatorId: string) {
    return this.institutionsService.approve(id, operatorId);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectInstitutionDto) {
    return this.institutionsService.reject(id, dto.reason);
  }
}
