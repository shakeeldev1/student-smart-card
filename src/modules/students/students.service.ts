import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateOwnStudentProfileDto } from './dto/update-own-student-profile.dto';
import { InstitutionsService } from '../institutions/institutions.service';
import { CardsService } from '../cards/cards.service';
import { ClassesService } from '../classes/classes.service';
import { SectionsService } from '../classes/sections.service';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ApplicationStatus } from './enums/application-status.enum';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { parseDateRange } from '../../common/utils/date-range.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { Multer } from 'multer';

export interface StudentFilters {
  status?: ApplicationStatus;
  certificateStatus?: 'issued' | 'not_issued';
  search?: string;
  institutionId?: string;
  classId?: string;
  sectionId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly institutionsService: InstitutionsService,
    private readonly cardsService: CardsService,
    private readonly classesService: ClassesService,
    private readonly sectionsService: SectionsService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailProvider,
    private readonly config: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    currentUser: JwtPayload,
    dto: CreateStudentDto,
  ): Promise<Student> {
    const existing = await this.studentsRepository.findOne({
      where: { bFormNumber: dto.bFormNumber },
    });
    if (existing) {
      throw new ConflictException(
        'A student with this B-Form number already exists',
      );
    }

    // Students are enrolled only by their school. (Adults without a school
    // register themselves through the separate Individual flow.)
    if (currentUser.role !== UserRole.SCHOOL) {
      throw new ForbiddenException('Only a school can enroll students');
    }

    const institutionNameFreeText: string | null = null;
    let classId: string | null = null;
    let sectionId: string | null = null;
    let className = dto.className?.trim() || null;
    const consent = {
      consentEnrollment: true,
      consentIdentityVerification: true,
      consentTermsAccepted: true,
      consentDeclarationAccepted: true,
    };

    const institution = await this.institutionsService.findByOwnerUserId(
      currentUser.sub,
    );
    if (!institution) {
      throw new ForbiddenException('No institution found for this account');
    }
    const institutionId: string | null = institution.id;
    // Students registered directly by a verified school are trusted and
    // skip manual review; a school whose own institution hasn't been
    // approved yet still goes through the normal pending queue.
    const autoApprove =
      institution.approvalStatus === InstitutionApprovalStatus.APPROVED;

    if (dto.classId) {
      const schoolClass = await this.classesService.findByIdForOwnership(
        dto.classId,
        institution.id,
      );
      classId = schoolClass.id;
      className = schoolClass.name;

      if (dto.sectionId) {
        const section = await this.sectionsService.findByIdForClassOwnership(
          dto.sectionId,
          classId,
        );
        sectionId = section.id;
      }
    } else if (!className) {
      throw new BadRequestException('classId or className is required');
    }

    const student = this.studentsRepository.create({
      fullName: dto.fullName,
      fatherName: dto.fatherName,
      motherName: dto.motherName ?? null,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      bFormNumber: dto.bFormNumber,
      className: className!,
      rollNumber: await this.normalizeRollNumber(dto.rollNumber, institutionId),
      classId,
      sectionId,
      contactNumber: dto.contactNumber ?? null,
      email: dto.email ?? null,
      guardianName: dto.guardianName,
      guardianCnic: dto.guardianCnic,
      guardianDateOfBirth: dto.guardianDateOfBirth,
      guardianRelationship: dto.guardianRelationship,
      guardianMobile: dto.guardianMobile ?? null,
      guardianEmail: dto.guardianEmail ?? null,
      guardianAddress: dto.guardianAddress ?? null,
      guardianCity: dto.guardianCity ?? null,
      institutionNameFreeText,
      ...consent,
      institutionId,
      registeredByUserId: currentUser.sub,
      ...(autoApprove && {
        status: ApplicationStatus.APPROVED,
        reviewedAt: new Date(),
        reviewNote: 'Auto-approved: registered directly by a verified school',
      }),
    });
    let saved = await this.studentsRepository.save(student);

    if (autoApprove) {
      saved = await this.grantCertificateAndCard(saved);
    }

    // Generate setup token and send email
    if (saved.email) {
      await this.sendSetupEmail(saved);
    }

    return saved;
  }

  /**
   * Trims the roll number and enforces uniqueness within the institution
   * (a DB partial unique index backs this up). Blank → null.
   */
  private async normalizeRollNumber(
    rollNumber: string | undefined | null,
    institutionId: string | null,
    excludeStudentId?: string,
  ): Promise<string | null> {
    const value = rollNumber?.trim() || null;
    if (!value || !institutionId) {
      return value;
    }
    const clash = await this.studentsRepository.findOne({
      where: { institutionId, rollNumber: value },
    });
    if (clash && clash.id !== excludeStudentId) {
      throw new ConflictException(
        `Roll number ${value} is already assigned to another student in this institution`,
      );
    }
    return value;
  }

  /**
   * Re-sends the account setup link (new 7-day token). For when the first
   * email expired, was lost, or the email was only added after registration.
   */
  async resendSetupEmail(
    currentUser: JwtPayload,
    id: string,
  ): Promise<{ message: string }> {
    const student = await this.findOneForUser(currentUser, id);
    if (student.userId) {
      throw new BadRequestException(
        'This student has already set up their account',
      );
    }
    if (!student.email) {
      throw new BadRequestException(
        'Add an email address for this student before sending the setup link',
      );
    }
    await this.sendSetupEmail(student);
    return { message: `Setup link sent to ${student.email}` };
  }

  private async sendSetupEmail(student: Student): Promise<void> {
    const setupToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    student.setupToken = setupToken;
    student.setupTokenExpiresAt = expiresAt;
    await this.studentsRepository.save(student);

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const setupLink = `${frontendUrl}/student-setup?token=${setupToken}`;
    await this.emailService.sendStudentSetupEmail(
      student.email!,
      student.fullName,
      setupLink,
    );
  }

  async findAllForUser(
    currentUser: JwtPayload,
    filters: StudentFilters = {},
  ): Promise<Student[]> {
    const qb = this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.card', 'card')
      .leftJoinAndSelect('student.institution', 'institution')
      .leftJoinAndSelect('student.schoolClass', 'schoolClass')
      .leftJoinAndSelect('student.section', 'section');

    if (currentUser.role === UserRole.SCHOOL) {
      const institution = await this.institutionsService.findByOwnerUserId(
        currentUser.sub,
      );
      if (!institution) return [];
      qb.andWhere('student.institutionId = :institutionId', {
        institutionId: institution.id,
      });
    } else if (
      (currentUser.role === UserRole.ADMIN ||
        currentUser.role === UserRole.EFU) &&
      filters.institutionId
    ) {
      qb.andWhere('student.institutionId = :institutionId', {
        institutionId: filters.institutionId,
      });
    }

    const { from, to } = parseDateRange(filters.startDate, filters.endDate);
    if (from) {
      qb.andWhere('student.createdAt >= :fromDate', { fromDate: from });
    }
    if (to) {
      qb.andWhere('student.createdAt <= :toDate', { toDate: to });
    }

    if (filters.classId) {
      qb.andWhere('student.classId = :classId', { classId: filters.classId });
    }

    if (filters.sectionId) {
      qb.andWhere('student.sectionId = :sectionId', {
        sectionId: filters.sectionId,
      });
    }

    if (filters.status) {
      qb.andWhere('student.status = :status', { status: filters.status });
    }

    if (filters.certificateStatus === 'issued') {
      qb.andWhere('student.certificateIssued = true');
    } else if (filters.certificateStatus === 'not_issued') {
      qb.andWhere('student.certificateIssued = false');
    }

    if (filters.search) {
      qb.andWhere(
        '(student.fullName ILIKE :search OR student.guardianName ILIKE :search OR student.bFormNumber ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('student.createdAt', 'DESC');
    return qb.getMany();
  }

  async uploadPhoto(
    currentUser: JwtPayload,
    id: string,
    file: Multer.File,
  ): Promise<{ photoUrl: string }> {
    const student = await this.findOneForUser(currentUser, id);

    const uploaded = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'student-smart-card/applicant-photos',
      file.originalname,
    );

    const previousPublicId = student.photoPublicId;
    student.photoUrl = uploaded.url;
    student.photoPublicId = uploaded.publicId;
    await this.studentsRepository.save(student);

    if (previousPublicId) {
      await this.cloudinaryService.destroy(previousPublicId);
    }

    return { photoUrl: uploaded.url };
  }

  async findOneForUser(currentUser: JwtPayload, id: string): Promise<Student> {
    const student = await this.findByIdOrThrow(id);
    await this.assertOwnership(currentUser, student);
    return student;
  }

  async findByUserId(userId: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { userId },
      relations: { card: true, institution: true, section: true },
    });
    if (!student) {
      throw new NotFoundException('No student record linked to this account');
    }
    return student;
  }

  async update(
    currentUser: JwtPayload,
    id: string,
    dto: UpdateStudentDto,
  ): Promise<Student> {
    const student = await this.findOneForUser(currentUser, id);

    if (dto.classId !== undefined || dto.sectionId !== undefined) {
      if (currentUser.role !== UserRole.SCHOOL) {
        throw new ForbiddenException(
          "Only the school can reassign a student's class or section",
        );
      }

      let targetClassId = student.classId;
      if (dto.classId) {
        const schoolClass = await this.classesService.findByIdForOwnership(
          dto.classId,
          student.institutionId!,
        );
        student.classId = schoolClass.id;
        student.className = schoolClass.name;
        targetClassId = schoolClass.id;
      }

      if (dto.sectionId !== undefined) {
        if (dto.sectionId === null) {
          student.sectionId = null;
        } else {
          if (!targetClassId) {
            throw new BadRequestException(
              'Assign a class before assigning a section',
            );
          }
          const section = await this.sectionsService.findByIdForClassOwnership(
            dto.sectionId,
            targetClassId,
          );
          student.sectionId = section.id;
        }
      }
    }

    const {
      classId: _classId,
      sectionId: _sectionId,
      rollNumber,
      ...rest
    } = dto;
    if (rollNumber !== undefined) {
      student.rollNumber = await this.normalizeRollNumber(
        rollNumber,
        student.institutionId,
        student.id,
      );
    }

    const hadEmail = Boolean(student.email);
    Object.assign(student, rest);
    const saved = await this.studentsRepository.save(student);

    // An email added after registration never received the setup link.
    if (!hadEmail && saved.email && !saved.userId) {
      await this.sendSetupEmail(saved);
    }
    return saved;
  }

  async updateOwnProfile(
    userId: string,
    dto: UpdateOwnStudentProfileDto,
  ): Promise<Student> {
    const student = await this.findByUserId(userId);
    Object.assign(student, dto);
    return this.studentsRepository.save(student);
  }

  async remove(currentUser: JwtPayload, id: string): Promise<void> {
    const student = await this.findOneForUser(currentUser, id);
    await this.studentsRepository.remove(student);
  }

  async approve(operatorId: string, id: string): Promise<Student> {
    const student = await this.findByIdOrThrow(id);
    student.status = ApplicationStatus.APPROVED;
    student.reviewedByUserId = operatorId;
    student.reviewedAt = new Date();
    student.reviewNote = null;
    // Same outcome as a verified school's auto-approval: an approved student
    // gets their certificate and (pending-verification) card immediately, so
    // no approved student is left without a card.
    return this.grantCertificateAndCard(student);
  }

  async reject(
    operatorId: string,
    id: string,
    reason?: string,
  ): Promise<Student> {
    const student = await this.findByIdOrThrow(id);
    student.status = ApplicationStatus.REJECTED;
    student.reviewedByUserId = operatorId;
    student.reviewedAt = new Date();
    student.reviewNote = reason ?? null;
    const saved = await this.studentsRepository.save(student);
    // A rejected student must not keep a usable card (e.g. one issued by an
    // earlier auto-approval) — partners like SSC only honor ACTIVE cards.
    await this.cardsService.suspendForStudent(saved.id);
    return saved;
  }

  async requestChanges(
    operatorId: string,
    id: string,
    reason: string,
  ): Promise<Student> {
    const student = await this.findByIdOrThrow(id);
    student.status = ApplicationStatus.CHANGES_REQUESTED;
    student.reviewedByUserId = operatorId;
    student.reviewedAt = new Date();
    student.reviewNote = reason;
    return this.studentsRepository.save(student);
  }

  async issueCertificate(id: string): Promise<Student> {
    const student = await this.findByIdOrThrow(id);
    if (student.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved applications can receive a certificate',
      );
    }
    return this.grantCertificateAndCard(student);
  }

  private async grantCertificateAndCard(student: Student): Promise<Student> {
    if (!student.certificateIssued) {
      student.certificateIssued = true;
      student.certificateNumber = `SSC-${randomBytes(4).toString('hex').toUpperCase()}`;
      student.certificateIssuedAt = new Date();
    }
    const saved = await this.studentsRepository.save(student);
    saved.card = await this.cardsService.issueForStudent(saved.id);
    return saved;
  }

  private async findByIdOrThrow(id: string): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: { card: true, institution: true, schoolClass: true, section: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  private async assertOwnership(
    currentUser: JwtPayload,
    student: Student,
  ): Promise<void> {
    if (
      currentUser.role === UserRole.OPERATOR ||
      currentUser.role === UserRole.EFU ||
      currentUser.role === UserRole.ADMIN
    ) {
      return;
    }

    if (currentUser.role === UserRole.SCHOOL) {
      const institution = await this.institutionsService.findByOwnerUserId(
        currentUser.sub,
      );
      if (!institution || student.institutionId !== institution.id) {
        throw new ForbiddenException(
          'You do not have access to this student record',
        );
      }
      return;
    }

    // Otherwise only the student themselves.
    if (!student.userId || student.userId !== currentUser.sub) {
      throw new ForbiddenException(
        'You do not have access to this student record',
      );
    }
  }
}
