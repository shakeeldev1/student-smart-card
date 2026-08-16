import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UserRole } from '../users/enums/user-role.enum';
import type { User } from '../users/entities/user.entity';

@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  async createClaim(
    @CurrentUser() user: User,
    @Body() createClaimDto: CreateClaimDto,
  ) {
    return this.claimsService.createClaim(user.id, createClaimDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT, UserRole.OPERATOR, UserRole.EFU, UserRole.ADMIN)
  async getClaims(@CurrentUser() user: User) {
    if (user.role === UserRole.PARENT) {
      return this.claimsService.getClaimsByStudent(user.id);
    }
    return this.claimsService.getAllClaims();
  }

  @Get(':claimId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT, UserRole.OPERATOR, UserRole.EFU, UserRole.ADMIN)
  async getClaimById(
    @CurrentUser() user: User,
    @Param('claimId') claimId: string,
  ) {
    if (user.role === UserRole.PARENT) {
      return this.claimsService.getClaimById(claimId, user.id);
    }
    return this.claimsService.getClaimByIdNoAuth(claimId);
  }
}
