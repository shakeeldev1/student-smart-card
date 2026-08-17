import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { EfuService } from './efu.service';

@Controller('efu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EFU)
export class EfuController {
  constructor(private readonly efuService: EfuService) {}

  @Get('stats')
  getStats() {
    return this.efuService.getStats();
  }

  @Get('reports/students.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="efu-students-report.csv"')
  getStudentsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.efuService.getStudentsReportCsv(startDate, endDate);
  }

  @Get('reports/schools.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="efu-schools-report.csv"')
  getSchoolsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.efuService.getSchoolsReportCsv(startDate, endDate);
  }
}
