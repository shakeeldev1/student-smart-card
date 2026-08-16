import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateInternshipApplicationDto } from './dto/create-internship-application.dto';
import { InternshipApplication } from './entities/internship-application.entity';
import { InternshipApplicationStatus } from './enums/internship-application-status.enum';

export interface InternshipFilters {
  status?: InternshipApplicationStatus;
  search?: string;
}

export interface InternshipDocumentPaths {
  recentPhotographPath: string;
  studentCardInstitutionIdPath: string;
  academicCertificateTranscriptPath: string;
  recommendationLetterNocPath: string;
}

@Injectable()
export class InternshipsService {
  constructor(
    @InjectRepository(InternshipApplication)
    private readonly internshipRepository: Repository<InternshipApplication>,
  ) {}

  async create(
    currentUser: JwtPayload,
    dto: CreateInternshipApplicationDto,
    documents: InternshipDocumentPaths,
  ): Promise<InternshipApplication> {
    const duplicate = await this.internshipRepository.findOne({
      where: { bFormOrCnicNo: dto.bFormOrCnicNo },
    });
    if (duplicate) {
      throw new ConflictException(
        'An internship application already exists for this B-Form/CNIC number',
      );
    }

    const application = this.internshipRepository.create({
      ...dto,
      ...documents,
      registeredByUserId: currentUser.sub,
      status: InternshipApplicationStatus.PENDING,
    });

    return this.internshipRepository.save(application);
  }

  async findAllForUser(
    currentUser: JwtPayload,
    filters: InternshipFilters = {},
  ): Promise<InternshipApplication[]> {
    const qb = this.internshipRepository.createQueryBuilder('application');

    if (currentUser.role !== UserRole.OPERATOR) {
      qb.andWhere('application.registeredByUserId = :userId', {
        userId: currentUser.sub,
      });
    }

    if (filters.status) {
      qb.andWhere('application.status = :status', { status: filters.status });
    }

    if (filters.search) {
      qb.andWhere(
        `(application.fullName ILIKE :search
          OR application.fatherGuardianName ILIKE :search
          OR application.bFormOrCnicNo ILIKE :search
          OR application.studentRegistrationNo ILIKE :search
          OR application.institutionName ILIKE :search)`,
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('application.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOneForUser(
    currentUser: JwtPayload,
    id: string,
  ): Promise<InternshipApplication> {
    const application = await this.findByIdOrThrow(id);
    if (
      currentUser.role !== UserRole.OPERATOR &&
      application.registeredByUserId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'You do not have access to this internship application',
      );
    }
    return application;
  }

  async approve(operatorId: string, id: string): Promise<InternshipApplication> {
    const application = await this.findByIdOrThrow(id);
    application.status = InternshipApplicationStatus.APPROVED;
    application.reviewedByUserId = operatorId;
    application.reviewedAt = new Date();
    application.reviewNote = null;
    return this.internshipRepository.save(application);
  }

  async reject(
    operatorId: string,
    id: string,
    reason?: string,
  ): Promise<InternshipApplication> {
    const application = await this.findByIdOrThrow(id);
    application.status = InternshipApplicationStatus.REJECTED;
    application.reviewedByUserId = operatorId;
    application.reviewedAt = new Date();
    application.reviewNote = reason ?? null;
    return this.internshipRepository.save(application);
  }

  async requestChanges(
    operatorId: string,
    id: string,
    reason: string,
  ): Promise<InternshipApplication> {
    const application = await this.findByIdOrThrow(id);
    application.status = InternshipApplicationStatus.CHANGES_REQUESTED;
    application.reviewedByUserId = operatorId;
    application.reviewedAt = new Date();
    application.reviewNote = reason;
    return this.internshipRepository.save(application);
  }

  private async findByIdOrThrow(id: string): Promise<InternshipApplication> {
    const application = await this.internshipRepository.findOne({
      where: { id },
    });
    if (!application) {
      throw new NotFoundException('Internship application not found');
    }
    return application;
  }
}
