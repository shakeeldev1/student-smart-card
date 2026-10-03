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
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from './enums/payment-status.enum';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const proofUpload = (field: string) =>
  UseInterceptors(
    FileInterceptor(field, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PROOF_SIZE_BYTES },
    }),
  );

const assertImage = (file?: Multer.File): Multer.File => {
  if (!file) {
    throw new BadRequestException('A payment screenshot/image is required');
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('Image must be a JPEG, PNG or WEBP file');
  }
  return file;
};

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ---- Payment instructions (bank details + QR) ----

  @Get('settings')
  @Roles(
    UserRole.SCHOOL,
    UserRole.INDIVIDUAL,
    UserRole.ADMIN,
    UserRole.OPERATOR,
    UserRole.EFU,
  )
  getSettings() {
    return this.paymentsService.getSettings();
  }

  @Put('settings')
  @Roles(UserRole.ADMIN)
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentsService.updateSettings(dto, user.sub);
  }

  @Post('settings/qr')
  @Roles(UserRole.ADMIN)
  @proofUpload('qr')
  updateQr(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Multer.File) {
    const image = assertImage(file);
    return this.paymentsService.updateQr(image.buffer, image.originalname, user.sub);
  }

  // ---- School: pay for a student ----

  @Get('students/:studentId')
  @Roles(UserRole.SCHOOL, UserRole.ADMIN)
  getForStudent(@Param('studentId') studentId: string) {
    return this.paymentsService.getForStudent(studentId);
  }

  @Post('students/:studentId')
  @Roles(UserRole.SCHOOL, UserRole.ADMIN)
  @proofUpload('proof')
  submitForStudent(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Body() dto: SubmitPaymentDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.paymentsService.submitForStudent(user, studentId, dto, assertImage(file));
  }

  // ---- Individual: pay for yourself ----

  @Get('individuals/me')
  @Roles(UserRole.INDIVIDUAL)
  getMine(@CurrentUser('sub') userId: string) {
    return this.paymentsService.getMineForIndividual(userId);
  }

  @Post('individuals/me')
  @Roles(UserRole.INDIVIDUAL)
  @proofUpload('proof')
  submitMine(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubmitPaymentDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.paymentsService.submitForIndividual(userId, dto, assertImage(file));
  }

  // ---- Admin: verification queue ----

  @Get('admin')
  @Roles(UserRole.ADMIN)
  listForAdmin(
    @Query('status') status?: PaymentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listForAdmin({ status, page, limit });
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN)
  confirm(@CurrentUser('sub') adminId: string, @Param('id') id: string) {
    return this.paymentsService.confirm(id, adminId);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(
    @CurrentUser('sub') adminId: string,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.paymentsService.reject(id, adminId, dto.reason);
  }
}
