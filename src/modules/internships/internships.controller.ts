import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { memoryStorage } from 'multer';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateInternshipApplicationDto } from './dto/create-internship-application.dto';
import {
  RejectInternshipApplicationDto,
  RequestChangesInternshipApplicationDto,
} from './dto/review-internship-application.dto';
import { InternshipsService } from './internships.service';
import { InternshipApplicationStatus } from './enums/internship-application-status.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const CLOUDINARY_FOLDER = 'student-smart-card/internships';

@Controller('internships')
@UseGuards(JwtAuthGuard)
export class InternshipsController {
  constructor(
    private readonly internshipsService: InternshipsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'recentPhotograph', maxCount: 1 },
        { name: 'studentCardInstitutionId', maxCount: 1 },
        { name: 'academicCertificateTranscript', maxCount: 1 },
        { name: 'recommendationLetterNoc', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        fileFilter: (_req, file, cb) => {
          const allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
          ];
          if (!allowed.includes(file.mimetype)) {
            cb(
              new BadRequestException(
                'Only JPG, PNG, WEBP, and PDF files are allowed',
              ),
              false,
            );
            return;
          }
          cb(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
      },
    ),
  )
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInternshipApplicationDto,
    @UploadedFiles()
    files: {
      recentPhotograph?: Multer.File[];
      studentCardInstitutionId?: Multer.File[];
      academicCertificateTranscript?: Multer.File[];
      recommendationLetterNoc?: Multer.File[];
    },
  ) {
    const recentPhotograph = files.recentPhotograph?.[0];
    const studentCardInstitutionId = files.studentCardInstitutionId?.[0];
    const academicCertificateTranscript = files.academicCertificateTranscript?.[0];
    const recommendationLetterNoc = files.recommendationLetterNoc?.[0];

    if (
      !recentPhotograph ||
      !studentCardInstitutionId ||
      !academicCertificateTranscript ||
      !recommendationLetterNoc
    ) {
      throw new BadRequestException('All required documents must be uploaded');
    }

    const [photo, studentId, transcript, noc] = await Promise.all([
      this.cloudinaryService.uploadBuffer(
        recentPhotograph.buffer,
        CLOUDINARY_FOLDER,
        recentPhotograph.originalname,
      ),
      this.cloudinaryService.uploadBuffer(
        studentCardInstitutionId.buffer,
        CLOUDINARY_FOLDER,
        studentCardInstitutionId.originalname,
      ),
      this.cloudinaryService.uploadBuffer(
        academicCertificateTranscript.buffer,
        CLOUDINARY_FOLDER,
        academicCertificateTranscript.originalname,
      ),
      this.cloudinaryService.uploadBuffer(
        recommendationLetterNoc.buffer,
        CLOUDINARY_FOLDER,
        recommendationLetterNoc.originalname,
      ),
    ]);

    return this.internshipsService.create(user, dto, {
      recentPhotographPath: photo.url,
      studentCardInstitutionIdPath: studentId.url,
      academicCertificateTranscriptPath: transcript.url,
      recommendationLetterNocPath: noc.url,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: InternshipApplicationStatus,
    @Query('search') search?: string,
  ) {
    return this.internshipsService.findAllForUser(user, { status, search });
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.internshipsService.findOneForUser(user, id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  approve(@CurrentUser('sub') operatorId: string, @Param('id') id: string) {
    return this.internshipsService.approve(operatorId, id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  reject(
    @CurrentUser('sub') operatorId: string,
    @Param('id') id: string,
    @Body() dto: RejectInternshipApplicationDto,
  ) {
    return this.internshipsService.reject(operatorId, id, dto.reason);
  }

  @Patch(':id/request-changes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  requestChanges(
    @CurrentUser('sub') operatorId: string,
    @Param('id') id: string,
    @Body() dto: RequestChangesInternshipApplicationDto,
  ) {
    return this.internshipsService.requestChanges(operatorId, id, dto.reason);
  }
}
