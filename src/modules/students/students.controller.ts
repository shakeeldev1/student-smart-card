import {
  BadRequestException,
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
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateOwnStudentProfileDto } from './dto/update-own-student-profile.dto';
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
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.studentsService.findAllForUser(user, {
      status,
      certificateStatus,
      search,
      institutionId,
      classId,
      sectionId,
      startDate,
      endDate,
    });
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  findMine(@CurrentUser('sub') userId: string) {
    return this.studentsService.findByUserId(userId);
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

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  updateMine(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateOwnStudentProfileDto,
  ) {
    return this.studentsService.updateOwnProfile(userId, dto);
  }

  @Post(':id/photo')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT, UserRole.SCHOOL, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          cb(
            new BadRequestException('Only JPG, PNG, and WEBP images are allowed'),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPhoto(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFile() file: Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No photo file was provided');
    }
    return this.studentsService.uploadPhoto(user, id, file);
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
