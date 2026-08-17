import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { IndividualsService } from './individuals.service';
import { CreateIndividualApplicationDto } from './dto/create-individual-application.dto';
import { UpdateIndividualApplicationDto } from './dto/update-individual-application.dto';
import {
  RejectIndividualApplicationDto,
  RequestChangesIndividualApplicationDto,
} from './dto/review-individual-application.dto';
import { VerifyIndividualCardDto } from './dto/verify-individual-card.dto';
import { ApplicationStatus } from '../students/enums/application-status.enum';

@Controller('individuals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IndividualsController {
  constructor(private readonly individualsService: IndividualsService) {}

  @Post()
  @Roles(UserRole.INDIVIDUAL)
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateIndividualApplicationDto,
  ) {
    return this.individualsService.create(userId, dto);
  }

  @Get('me')
  @Roles(UserRole.INDIVIDUAL)
  findMine(@CurrentUser('sub') userId: string) {
    return this.individualsService.findMine(userId);
  }

  @Patch('me')
  @Roles(UserRole.INDIVIDUAL)
  updateMine(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateIndividualApplicationDto,
  ) {
    return this.individualsService.updateMine(userId, dto);
  }

  @Post('me/card/send-verification-email')
  @Roles(UserRole.INDIVIDUAL)
  sendCardVerificationEmail(@CurrentUser('sub') userId: string) {
    return this.individualsService.sendCardVerificationEmail(userId);
  }

  @Post('me/card/verify')
  @Roles(UserRole.INDIVIDUAL)
  verifyCard(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyIndividualCardDto,
  ) {
    return this.individualsService.verifyCard(userId, dto.code);
  }

  @Get()
  @Roles(UserRole.OPERATOR, UserRole.EFU, UserRole.ADMIN)
  findAll(
    @Query('status') status?: ApplicationStatus,
    @Query('search') search?: string,
  ) {
    return this.individualsService.findAllAdmin({ status, search });
  }

  @Patch(':id/approve')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  approve(@CurrentUser('sub') operatorId: string, @Param('id') id: string) {
    return this.individualsService.approve(operatorId, id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  reject(
    @CurrentUser('sub') operatorId: string,
    @Param('id') id: string,
    @Body() dto: RejectIndividualApplicationDto,
  ) {
    return this.individualsService.reject(operatorId, id, dto.reason);
  }

  @Patch(':id/request-changes')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  requestChanges(
    @CurrentUser('sub') operatorId: string,
    @Param('id') id: string,
    @Body() dto: RequestChangesIndividualApplicationDto,
  ) {
    return this.individualsService.requestChanges(operatorId, id, dto.reason);
  }

  @Patch(':id/issue-certificate')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  issueCertificate(@Param('id') id: string) {
    return this.individualsService.issueCertificate(id);
  }
}
