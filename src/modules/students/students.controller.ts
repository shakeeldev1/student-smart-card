import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import {
  RejectStudentDto,
  RequestChangesStudentDto,
} from './dto/review-student.dto';
import { ApplicationStatus } from './enums/application-status.enum';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT, UserRole.SCHOOL)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(user, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.PARENT,
    UserRole.SCHOOL,
    UserRole.OPERATOR,
    UserRole.EFU,
    UserRole.ADMIN,
  )
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: ApplicationStatus,
    @Query('certificateStatus') certificateStatus?: 'issued' | 'not_issued',
    @Query('search') search?: string,
    @Query('institutionId') institutionId?: string,
  ) {
    return this.studentsService.findAllForUser(user, {
      status,
      certificateStatus,
      search,
      institutionId,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.PARENT,
    UserRole.SCHOOL,
    UserRole.OPERATOR,
    UserRole.EFU,
    UserRole.ADMIN,
  )
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.studentsService.findOneForUser(user, id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  approve(@CurrentUser('sub') operatorId: string, @Param('id') id: string) {
    return this.studentsService.approve(operatorId, id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  reject(
    @CurrentUser('sub') operatorId: string,
    @Param('id') id: string,
    @Body() dto: RejectStudentDto,
  ) {
    return this.studentsService.reject(operatorId, id, dto.reason);
  }

  @Patch(':id/request-changes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  requestChanges(
    @CurrentUser('sub') operatorId: string,
    @Param('id') id: string,
    @Body() dto: RequestChangesStudentDto,
  ) {
    return this.studentsService.requestChanges(operatorId, id, dto.reason);
  }

  @Patch(':id/issue-certificate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  issueCertificate(@Param('id') id: string) {
    return this.studentsService.issueCertificate(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT, UserRole.SCHOOL, UserRole.ADMIN)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT, UserRole.SCHOOL, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.studentsService.remove(user, id);
    return { message: 'Student removed' };
  }
}
