import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { InstitutionsService } from './institutions.service';
import { RejectInstitutionDto } from './dto/reject-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { InstitutionApprovalStatus } from './enums/institution-approval-status.enum';

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
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  findPending() {
    return this.institutionsService.findPending();
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EFU)
  findAllAdmin(
    @Query('status') status?: InstitutionApprovalStatus,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.institutionsService.findAllAdmin({
      status,
      search,
      startDate,
      endDate,
    });
  }

  @Patch('me')
  @Roles(UserRole.SCHOOL)
  updateMine(
    @CurrentUser('sub') ownerUserId: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutionsService.updateOwn(ownerUserId, dto);
  }

  @Patch(':id/approve')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser('sub') operatorId: string) {
    return this.institutionsService.approve(id, operatorId);
  }

  @Patch(':id/reject')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() dto: RejectInstitutionDto) {
    return this.institutionsService.reject(id, dto.reason);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.institutionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.institutionsService.remove(id);
  }
}
