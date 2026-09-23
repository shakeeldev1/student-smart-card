import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Individual } from './entities/individual.entity';
import { IndividualCard } from './entities/individual-card.entity';
import { CreateIndividualApplicationDto } from './dto/create-individual-application.dto';
import { UpdateIndividualApplicationDto } from './dto/update-individual-application.dto';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { CardStatus } from '../cards/enums/card-status.enum';
import { ConfigService } from '@nestjs/config';
import {
  CARD_VALIDITY_MONTHS_DEFAULT,
  cardExpiryFrom,
  consumeVerificationCode,
  issueVerificationCode,
} from '../cards/card-verification.util';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { Multer } from 'multer';

export interface IndividualFilters {
  status?: ApplicationStatus;
  search?: string;
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

@Injectable()
export class IndividualsService {
  constructor(
    @InjectRepository(Individual)
    private readonly individualsRepository: Repository<Individual>,
    @InjectRepository(IndividualCard)
    private readonly cardsRepository: Repository<IndividualCard>,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailProvider,
    private readonly cloudinaryService: CloudinaryService,
    private readonly config: ConfigService,
  ) {}

  async create(
    userId: string,
    dto: CreateIndividualApplicationDto,
  ): Promise<Individual> {
    const existingForUser = await this.individualsRepository.findOne({
      where: { userId },
    });
    if (existingForUser) {
      throw new ConflictException(
        'You have already submitted an application',
      );
    }

    if (calculateAge(dto.dateOfBirth) < 18) {
      throw new BadRequestException(
        'You must be at least 18 years old to apply as an individual',
      );
    }

    const existingCnic = await this.individualsRepository.findOne({
      where: { cnicNumber: dto.cnicNumber },
    });
    if (existingCnic) {
      throw new ConflictException(
        'An application with this CNIC already exists',
      );
    }

    if (
      !dto.consentEnrollment ||
      !dto.consentIdentityVerification ||
      !dto.consentTermsAccepted ||
      !dto.consentDeclarationAccepted
    ) {
      throw new BadRequestException('All consent confirmations are required');
    }

    const individual = this.individualsRepository.create({
      userId,
      fullName: dto.fullName,
      fatherName: dto.fatherName ?? null,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      cnicNumber: dto.cnicNumber,
      contactNumber: dto.contactNumber ?? null,
      email: dto.email ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      nomineeName: dto.nomineeName,
      nomineeRelationship: dto.nomineeRelationship,
      nomineeCnic: dto.nomineeCnic,
      nomineeMobile: dto.nomineeMobile,
      nomineeEmail: dto.nomineeEmail ?? null,
      nomineeAddress: dto.nomineeAddress ?? null,
      nomineeCity: dto.nomineeCity ?? null,
      consentEnrollment: dto.consentEnrollment,
      consentIdentityVerification: dto.consentIdentityVerification,
      consentTermsAccepted: dto.consentTermsAccepted,
      consentDeclarationAccepted: dto.consentDeclarationAccepted,
    });

    return this.individualsRepository.save(individual);
  }

  async uploadMyPhoto(
    userId: string,
    file: Multer.File,
  ): Promise<{ photoUrl: string }> {
    const individual = await this.findMine(userId);

    const uploaded = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'student-smart-card/applicant-photos',
      file.originalname,
    );

    const previousPublicId = individual.photoPublicId;
    individual.photoUrl = uploaded.url;
    individual.photoPublicId = uploaded.publicId;
    await this.individualsRepository.save(individual);

    if (previousPublicId) {
      await this.cloudinaryService.destroy(previousPublicId);
    }

    return { photoUrl: uploaded.url };
  }

  async findMine(userId: string): Promise<Individual> {
    const individual = await this.individualsRepository.findOne({
      where: { userId },
      relations: { card: true },
    });
    if (!individual) {
      throw new NotFoundException('No application found for this account');
    }
    return individual;
  }

  async updateMine(
    userId: string,
    dto: UpdateIndividualApplicationDto,
  ): Promise<Individual> {
    const individual = await this.findMine(userId);
    if (
      individual.status !== ApplicationStatus.PENDING &&
      individual.status !== ApplicationStatus.CHANGES_REQUESTED
    ) {
      throw new BadRequestException(
        'This application can no longer be edited',
      );
    }
    Object.assign(individual, dto);

    if (individual.status === ApplicationStatus.CHANGES_REQUESTED) {
      individual.status = ApplicationStatus.PENDING;
      individual.reviewNote = null;
    }

    return this.individualsRepository.save(individual);
  }

  async findAllAdmin(filters: IndividualFilters = {}): Promise<Individual[]> {
    const qb = this.individualsRepository
      .createQueryBuilder('individual')
      .leftJoinAndSelect('individual.card', 'card')
      .leftJoinAndSelect('individual.user', 'user');

    if (filters.status) {
      qb.andWhere('individual.status = :status', { status: filters.status });
    }

    if (filters.search) {
      qb.andWhere(
        '(individual.fullName ILIKE :search OR individual.cnicNumber ILIKE :search OR individual.contactNumber ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('individual.createdAt', 'DESC');
    return qb.getMany();
  }

  private async findByIdOrThrow(id: string): Promise<Individual> {
    const individual = await this.individualsRepository.findOne({
      where: { id },
      relations: { card: true },
    });
    if (!individual) {
      throw new NotFoundException('Individual application not found');
    }
    return individual;
  }

  async approve(operatorId: string, id: string): Promise<Individual> {
    const individual = await this.findByIdOrThrow(id);
    individual.status = ApplicationStatus.APPROVED;
    individual.reviewedByUserId = operatorId;
    individual.reviewedAt = new Date();
    individual.reviewNote = null;
    await this.individualsRepository.save(individual);
    // Approval issues the certificate and (pending-verification) card right
    // away, matching the student flow — no approved holder without a card.
    return this.issueCertificate(individual.id);
  }

  async reject(
    operatorId: string,
    id: string,
    reason?: string,
  ): Promise<Individual> {
    const individual = await this.findByIdOrThrow(id);
    individual.status = ApplicationStatus.REJECTED;
    individual.reviewedByUserId = operatorId;
    individual.reviewedAt = new Date();
    individual.reviewNote = reason ?? null;
    // A rejected holder must not keep a usable card.
    if (individual.card && individual.card.status !== CardStatus.SUSPENDED) {
      individual.card.status = CardStatus.SUSPENDED;
      individual.card.verificationCode = null;
      individual.card.verificationCodeExpiresAt = null;
      await this.cardsRepository.save(individual.card);
    }
    return this.individualsRepository.save(individual);
  }

  async requestChanges(
    operatorId: string,
    id: string,
    reason: string,
  ): Promise<Individual> {
    const individual = await this.findByIdOrThrow(id);
    individual.status = ApplicationStatus.CHANGES_REQUESTED;
    individual.reviewedByUserId = operatorId;
    individual.reviewedAt = new Date();
    individual.reviewNote = reason;
    return this.individualsRepository.save(individual);
  }

  async issueCertificate(id: string): Promise<Individual> {
    const individual = await this.findByIdOrThrow(id);
    if (individual.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved applications can receive a certificate',
      );
    }

    if (!individual.certificateIssued) {
      individual.certificateIssued = true;
      individual.certificateNumber = `IND-CERT-${randomBytes(4).toString('hex').toUpperCase()}`;
      individual.certificateIssuedAt = new Date();
    }
    const saved = await this.individualsRepository.save(individual);

    const existingCard = await this.cardsRepository.findOne({
      where: { individualId: saved.id },
    });
    if (existingCard) {
      saved.card = existingCard;
      return saved;
    }

    const issuedAt = new Date();
    const card = this.cardsRepository.create({
      individualId: saved.id,
      cardNumber: `IND-CARD-${randomBytes(4).toString('hex').toUpperCase()}`,
      status: CardStatus.PENDING_VERIFICATION,
      issuedAt,
      expiresAt: cardExpiryFrom(
        issuedAt,
        Number(this.config.get('CARD_VALIDITY_MONTHS')) ||
          CARD_VALIDITY_MONTHS_DEFAULT,
      ),
    });
    saved.card = await this.cardsRepository.save(card);
    return saved;
  }

  async sendCardVerificationEmail(userId: string): Promise<{ message: string }> {
    const individual = await this.individualsRepository.findOne({
      where: { userId },
      relations: { card: true, user: true },
    });
    if (!individual) {
      throw new NotFoundException('No application found for this account');
    }
    if (!individual.card) {
      throw new BadRequestException('No card has been issued yet');
    }
    // Fall back to the self-registered account's login email.
    const email = individual.email ?? individual.user?.email ?? null;
    if (!email) {
      throw new BadRequestException(
        'An email address is required before card verification can be sent',
      );
    }

    const card = individual.card;
    const code = issueVerificationCode(card);
    await this.cardsRepository.save(card);

    await this.emailService.sendCardVerificationEmail(
      email,
      individual.fullName,
      card.cardNumber,
      code,
    );

    return { message: 'Verification email sent successfully' };
  }

  async verifyCard(userId: string, code: string): Promise<{ valid: boolean }> {
    const individual = await this.findMine(userId);
    const card = individual.card;

    if (!card || typeof code !== 'string') {
      return { valid: false };
    }

    const valid = consumeVerificationCode(card, code);
    // Persist either way: failed attempts are counted.
    await this.cardsRepository.save(card);
    return { valid };
  }
}
