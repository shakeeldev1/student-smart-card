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
import { SubmitBatchPaymentDto } from './dto/submit-batch-payment.dto';
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

  // Static routes must precede the ':studentId' param route below.
  @Get('students/outstanding')
  @Roles(UserRole.SCHOOL)
  getOutstanding(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getSchoolOutstanding(user);
  }

  @Post('students/batch')
  @Roles(UserRole.SCHOOL, UserRole.ADMIN)
  @proofUpload('proof')
  submitBatch(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitBatchPaymentDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.paymentsService.submitBatchForStudents(
      user,
      dto.studentIds,
      dto.reference,
      assertImage(file),
    );
  }

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

  // ---- Company: pay for an employee ----

  // Static routes must precede the ':employeeId' param route below.
  @Get('employees/outstanding')
  @Roles(UserRole.CORPORATE)
  getCompanyOutstanding(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getCompanyOutstanding(user);
  }

  @Post('employees/batch')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN)
  @proofUpload('proof')
  submitEmployeeBatch(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitBatchPaymentDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.paymentsService.submitBatchForEmployees(
      user,
      dto.studentIds,
      dto.reference,
      assertImage(file),
    );
  }

  @Get('employees/:employeeId')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN)
  getForEmployee(@Param('employeeId') employeeId: string) {
    return this.paymentsService.getForEmployee(employeeId);
  }

  @Post('employees/:employeeId')
  @Roles(UserRole.CORPORATE, UserRole.ADMIN)
  @proofUpload('proof')
  submitForEmployee(
    @CurrentUser() user: JwtPayload,
    @Param('employeeId') employeeId: string,
    @Body() dto: SubmitPaymentDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.paymentsService.submitForEmployee(user, employeeId, dto, assertImage(file));
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

  @Patch('batch/:batchId/confirm')
  @Roles(UserRole.ADMIN)
  confirmBatch(@CurrentUser('sub') adminId: string, @Param('batchId') batchId: string) {
    return this.paymentsService.confirmBatch(batchId, adminId);
  }

  @Patch('batch/:batchId/reject')
  @Roles(UserRole.ADMIN)
  rejectBatch(
    @CurrentUser('sub') adminId: string,
    @Param('batchId') batchId: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.paymentsService.rejectBatch(batchId, adminId, dto.reason);
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
