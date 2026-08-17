import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimStatusDto } from './dto/update-claim-status.dto';
import { UserRole } from '../users/enums/user-role.enum';
import type { User } from '../users/entities/user.entity';

const OWNER_ROLES = [UserRole.PARENT, UserRole.STUDENT];

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES)
  async createClaim(
    @CurrentUser() user: User,
    @Body() createClaimDto: CreateClaimDto,
  ) {
    return this.claimsService.createClaim(
      { id: user.id, role: user.role },
      createClaimDto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES, UserRole.OPERATOR, UserRole.EFU, UserRole.ADMIN)
  async getClaims(@CurrentUser() user: User) {
    if (OWNER_ROLES.includes(user.role)) {
      return this.claimsService.getClaimsForOwner({
        id: user.id,
        role: user.role,
      });
    }
    return this.claimsService.getAllClaims();
  }

  @Get(':claimId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...OWNER_ROLES, UserRole.OPERATOR, UserRole.EFU, UserRole.ADMIN)
  async getClaimById(
    @CurrentUser() user: User,
    @Param('claimId') claimId: string,
  ) {
    if (OWNER_ROLES.includes(user.role)) {
      return this.claimsService.getClaimByIdForOwner(claimId, {
        id: user.id,
        role: user.role,
      });
    }
    return this.claimsService.getClaimByIdNoAuth(claimId);
  }

  @Patch(':claimId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.EFU, UserRole.ADMIN)
  async updateStatus(
    @Param('claimId') claimId: string,
    @Body() dto: UpdateClaimStatusDto,
  ) {
    return this.claimsService.updateStatus(claimId, dto.status, dto.notes);
  }
}
