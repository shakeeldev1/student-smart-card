import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('reports/students.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="student-activity-report.csv"',
  )
  getStudentsReport() {
    return this.adminService.getStudentsReportCsv();
  }

  @Get('reports/institutions.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="institution-compliance-summary.csv"',
  )
  getInstitutionsReport() {
    return this.adminService.getInstitutionsReportCsv();
  }

  @Get('reports/claims.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="claims-overview.csv"',
  )
  getClaimsReport() {
    return this.adminService.getClaimsReportCsv();
  }

  @Get('reports/pending-approvals.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="pending-approvals.csv"',
  )
  getPendingApprovalsReport() {
    return this.adminService.getPendingApprovalsReportCsv();
  }
}
