import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto, ReviewReasonDto } from './dto/update-company.dto';

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const assertImage = (file?: Multer.File): Multer.File => {
  if (!file) throw new BadRequestException('An image file is required');
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('Image must be a JPEG, PNG or WEBP file');
  }
  return file;
};

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  @Roles(UserRole.CORPORATE)
  getMine(@CurrentUser('sub') userId: string) {
    return this.companiesService.findByOwnerUserId(userId);
  }

  @Put('me')
  @Roles(UserRole.CORPORATE)
  updateMine(@CurrentUser('sub') userId: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.updateOwn(userId, dto);
  }

  @Post('me/logo')
  @Roles(UserRole.CORPORATE)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_SIZE_BYTES },
    }),
  )
  uploadLogo(@CurrentUser('sub') userId: string, @UploadedFile() file?: Multer.File) {
    return this.companiesService.uploadOwnLogo(userId, assertImage(file));
  }

  // ---- Operator / admin review ----

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  listForAdmin(
    @Query('status') status?: InstitutionApprovalStatus,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.companiesService.findAllAdmin({ status, search, startDate, endDate });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  getOne(@Param('id') id: string) {
    return this.companiesService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Patch(':id/approve')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  approve(@CurrentUser('sub') reviewerId: string, @Param('id') id: string) {
    return this.companiesService.approve(id, reviewerId);
  }

  @Patch(':id/reject')
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() dto: ReviewReasonDto) {
    return this.companiesService.reject(id, dto.reason);
  }
}
