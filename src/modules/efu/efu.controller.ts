import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
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
import { UserRole } from '../users/enums/user-role.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { EfuService } from './efu.service';
import { EmailExportDto } from './dto/email-export.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('efu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EFU)
export class EfuController {
  constructor(private readonly efuService: EfuService) {}

  @Get('stats')
  getStats() {
    return this.efuService.getStats();
  }

  @Get('analytics')
  getAnalytics() {
    return this.efuService.getAnalytics();
  }

  @Get('students')
  listStudents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('certificateStatus') certificateStatus?: 'issued' | 'not_issued',
    @Query('institutionId') institutionId?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('gender') gender?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    return this.efuService.listStudents({
      page,
      limit,
      search,
      status,
      certificateStatus,
      institutionId,
      classId,
      sectionId,
      gender,
      startDate,
      endDate,
      paymentStatus,
    });
  }

  @Get('students/:id')
  getStudent(@Param('id') id: string) {
    return this.efuService.getStudentById(id);
  }

  @Patch('students/:id/approve')
  approveStudent(@CurrentUser('sub') efuUserId: string, @Param('id') id: string) {
    return this.efuService.approveStudent(efuUserId, id);
  }

  @Patch('students/:id/reject')
  rejectStudent(
    @CurrentUser('sub') efuUserId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.efuService.rejectStudent(efuUserId, id, reason);
  }

  @Patch('students/:id/request-changes')
  requestStudentChanges(
    @CurrentUser('sub') efuUserId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.efuService.requestStudentChanges(efuUserId, id, reason);
  }

  @Get('individuals')
  listIndividuals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('gender') gender?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    return this.efuService.listIndividuals({
      page,
      limit,
      search,
      status,
      gender,
      startDate,
      endDate,
      paymentStatus,
    });
  }

  @Get('individuals/:id')
  getIndividual(@Param('id') id: string) {
    return this.efuService.getIndividualById(id);
  }

  @Patch('individuals/:id/approve')
  approveIndividual(@CurrentUser('sub') efuUserId: string, @Param('id') id: string) {
    return this.efuService.approveIndividual(efuUserId, id);
  }

  @Patch('individuals/:id/reject')
  rejectIndividual(
    @CurrentUser('sub') efuUserId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.efuService.rejectIndividual(efuUserId, id, reason);
  }

  @Patch('individuals/:id/request-changes')
  requestIndividualChanges(
    @CurrentUser('sub') efuUserId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.efuService.requestIndividualChanges(efuUserId, id, reason);
  }

  @Post('email-export')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === XLSX_MIME ||
          file.mimetype === 'application/octet-stream' ||
          file.originalname.toLowerCase().endsWith('.xlsx');
        if (!ok) {
          cb(new BadRequestException('Only .xlsx files can be emailed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  emailExport(
    @CurrentUser('email') senderEmail: string | undefined,
    @UploadedFile() file: Multer.File | undefined,
    @Body() dto: EmailExportDto,
  ) {
    if (!file) {
      throw new BadRequestException('No Excel file was attached');
    }
    return this.efuService.emailExport(dto, file, senderEmail);
  }

  @Get('reports/students.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="efu-students-report.csv"')
  getStudentsReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.efuService.getStudentsReportCsv(startDate, endDate);
  }

  @Get('reports/schools.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="efu-schools-report.csv"')
  getSchoolsReport(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.efuService.getSchoolsReportCsv(startDate, endDate);
  }
}
