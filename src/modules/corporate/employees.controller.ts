import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ReviewReasonDto } from './dto/update-company.dto';

const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const assertImage = (file?: Multer.File): Multer.File => {
  if (!file) throw new BadRequestException('An image file is required');
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('Image must be a JPEG, PNG or WEBP file');
  }
  return file;
};

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ---- EFU queue (static routes before ':id') ----

  @Get('efu')
  @Roles(UserRole.EFU, UserRole.ADMIN)
  listForEfu(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('gender') gender?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.employeesService.listForEfu({
      page,
      limit,
      search,
      status,
      gender,
      paymentStatus,
      startDate,
      endDate,
    });
  }

  @Get('efu/:id')
  @Roles(UserRole.EFU, UserRole.ADMIN)
  getForEfu(@Param('id') id: string) {
    return this.employeesService.getForEfu(id);
  }

  @Patch('efu/:id/approve')
  @Roles(UserRole.EFU, UserRole.ADMIN)
  approveEfu(@CurrentUser('sub') efuId: string, @Param('id') id: string) {
    return this.employeesService.approveByEfu(efuId, id);
  }

  @Patch('efu/:id/reject')
  @Roles(UserRole.EFU, UserRole.ADMIN)
  rejectEfu(
    @CurrentUser('sub') efuId: string,
    @Param('id') id: string,
    @Body() dto: ReviewReasonDto,
  ) {
    return this.employeesService.rejectByEfu(efuId, id, dto.reason);
  }

  @Patch('efu/:id/request-changes')
  @Roles(UserRole.EFU, UserRole.ADMIN)
  requestChangesEfu(
    @CurrentUser('sub') efuId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.employeesService.requestChangesByEfu(efuId, id, reason);
  }

  // ---- Employee self ----

  @Get('me')
  @Roles(UserRole.EMPLOYEE)
  getMine(@CurrentUser('sub') userId: string) {
    return this.employeesService.findByUserId(userId);
  }

  // ---- Company / admin management ----

  @Get()
  @Roles(UserRole.CORPORATE, UserRole.ADMIN, UserRole.EFU)
  list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: ApplicationStatus,
    @Query('certificateStatus') certificateStatus?: 'issued' | 'not_issued',
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.employeesService.findAllForUser(user, {
      status,
      certificateStatus,
      search,
      companyId,
      startDate,
      endDate,
    });
  }

  @Post()
  @Roles(UserRole.CORPORATE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user, dto);
  }

  @Get(':id')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN, UserRole.EFU, UserRole.EMPLOYEE)
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.employeesService.findOneForUser(user, id);
  }

  @Patch(':id')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(user, id, dto);
  }

  @Post(':id/photo')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.employeesService.uploadPhoto(user, id, assertImage(file));
  }

  @Post(':id/resend-setup')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN)
  resendSetup(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.employeesService.resendSetupEmail(user, id);
  }

  @Delete(':id')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.employeesService.remove(user, id);
  }
}
