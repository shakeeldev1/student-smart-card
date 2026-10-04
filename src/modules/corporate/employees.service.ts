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
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Employee } from './entities/employee.entity';
import { EmployeeCard } from './entities/employee-card.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CompaniesService } from './companies.service';
import { CardsService } from '../cards/cards.service';
import { PaymentsService } from '../payments/payments.service';
import { UsersService } from '../users/users.service';
import { registrationFeeForVariant } from '../../common/payments/registration-fee.util';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { CardStatus } from '../cards/enums/card-status.enum';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import {
  EMAIL_SERVICE,
  type EmailProvider,
} from '../email/interfaces/email-provider.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { parseDateRange } from '../../common/utils/date-range.util';
import type { Multer } from 'multer';

export interface EmployeeFilters {
  status?: ApplicationStatus;
  certificateStatus?: 'issued' | 'not_issued';
  search?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
}

export interface EfuEmployeeQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  gender?: string;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}

export interface PaymentSummary {
  id: string;
  status: PaymentStatus;
  amount: number;
  productVariant: number;
  reference: string | null;
  proofImageUrl: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 15;

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
    @InjectRepository(EmployeeCard)
    private readonly cardsRepository: Repository<EmployeeCard>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly companiesService: CompaniesService,
    private readonly cardsService: CardsService,
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: EmailProvider,
    private readonly cloudinaryService: CloudinaryService,
    private readonly config: ConfigService,
  ) {}

  async create(currentUser: JwtPayload, dto: CreateEmployeeDto): Promise<Employee> {
    if (currentUser.role !== UserRole.CORPORATE) {
      throw new ForbiddenException('Only a company can enroll employees');
    }

    const company = await this.companiesService.findByOwnerUserId(currentUser.sub);
    if (!company) {
      throw new ForbiddenException('No company found for this account');
    }
    if (company.approvalStatus !== InstitutionApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        'Your company is pending approval. You can enroll employees once it has been approved.',
      );
    }

    const existing = await this.employeesRepository.findOne({
      where: { cnicNumber: dto.cnicNumber },
    });
    if (existing) {
      throw new ConflictException('An employee with this CNIC already exists');
    }

    // Catch an email clash now (at enrollment) rather than later at password setup.
    if (dto.email) {
      const emailOwner = await this.usersService.findByEmail(dto.email);
      if (emailOwner) {
        throw new ConflictException(
          'A user with this email already exists. Please use a different email.',
        );
      }
    }

    const employee = this.employeesRepository.create({
      fullName: dto.fullName,
      fatherOrHusbandName: dto.fatherOrHusbandName,
      cnicNumber: dto.cnicNumber,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      employeeCode: dto.employeeCode ?? null,
      department: dto.department ?? null,
      designation: dto.designation ?? null,
      joiningDate: dto.joiningDate ?? null,
      branchLocation: dto.branchLocation ?? null,
      province: dto.province ?? null,
      region: dto.region ?? null,
      district: dto.district ?? null,
      tehsil: dto.tehsil ?? null,
      contactNumber: dto.contactNumber ?? null,
      email: dto.email,
      productVariant: dto.productVariant,
      nomineeName: dto.nomineeName,
      nomineeRelationship: dto.nomineeRelationship,
      nomineeCnic: dto.nomineeCnic ?? null,
      nomineeDateOfBirth: dto.nomineeDateOfBirth ?? null,
      nomineeMobile: dto.nomineeMobile ?? null,
      companyId: company.id,
      registeredByUserId: currentUser.sub,
      publicToken: randomBytes(24).toString('hex'),
    });
    const saved = await this.employeesRepository.save(employee);

    if (saved.email) {
      await this.sendSetupEmail(saved);
    }
    return saved;
  }

  async resendSetupEmail(
    currentUser: JwtPayload,
    id: string,
  ): Promise<{ message: string }> {
    const employee = await this.findOneForUser(currentUser, id);
    if (!employee.email) {
      throw new BadRequestException('Add an email address before sending the link');
    }
    await this.sendSetupEmail(employee);
    // Existing account → the same link acts as a password reset.
    const action = employee.userId ? 'Password reset link' : 'Setup link';
    return { message: `${action} sent to ${employee.email}` };
  }

  private async sendSetupEmail(employee: Employee): Promise<void> {
    const setupToken = randomBytes(32).toString('hex');
    employee.setupToken = setupToken;
    employee.setupTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.employeesRepository.save(employee);

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const setupLink = `${frontendUrl}/employee-setup?token=${setupToken}`;
    await this.emailService.sendStudentSetupEmail(
      employee.email!,
      employee.fullName,
      setupLink,
    );
  }

  async findAllForUser(
    currentUser: JwtPayload,
    filters: EmployeeFilters = {},
  ): Promise<Employee[]> {
    const qb = this.employeesRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.card', 'card')
      .leftJoinAndSelect('employee.company', 'company');

    if (currentUser.role === UserRole.CORPORATE) {
      const company = await this.companiesService.findByOwnerUserId(currentUser.sub);
      if (!company) return [];
      qb.andWhere('employee.companyId = :companyId', { companyId: company.id });
    } else if (
      (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.EFU) &&
      filters.companyId
    ) {
      qb.andWhere('employee.companyId = :companyId', { companyId: filters.companyId });
    }

    const { from, to } = parseDateRange(filters.startDate, filters.endDate);
    if (from) qb.andWhere('employee.createdAt >= :fromDate', { fromDate: from });
    if (to) qb.andWhere('employee.createdAt <= :toDate', { toDate: to });

    if (filters.status) {
      qb.andWhere('employee.status = :status', { status: filters.status });
    }
    if (filters.certificateStatus === 'issued') {
      qb.andWhere('employee.certificateIssued = true');
    } else if (filters.certificateStatus === 'not_issued') {
      qb.andWhere('employee.certificateIssued = false');
    }
    if (filters.search) {
      qb.andWhere(
        '(employee.fullName ILIKE :search OR employee.cnicNumber ILIKE :search OR employee.employeeCode ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('employee.createdAt', 'DESC');
    return qb.getMany();
  }

  async uploadPhoto(
    currentUser: JwtPayload,
    id: string,
    file: Multer.File,
  ): Promise<{ photoUrl: string }> {
    const employee = await this.findOneForUser(currentUser, id);
    const uploaded = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'student-smart-card/applicant-photos',
      file.originalname,
    );
    const previousPublicId = employee.photoPublicId;
    employee.photoUrl = uploaded.url;
    employee.photoPublicId = uploaded.publicId;
    await this.employeesRepository.save(employee);
    if (previousPublicId) {
      await this.cloudinaryService.destroy(previousPublicId);
    }
    return { photoUrl: uploaded.url };
  }

  async findOneForUser(currentUser: JwtPayload, id: string): Promise<Employee> {
    const employee = await this.findByIdOrThrow(id);
    await this.assertOwnership(currentUser, employee);
    return employee;
  }

  async findByUserId(userId: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { userId },
      relations: { card: true, company: true },
    });
    if (!employee) {
      throw new NotFoundException('No employee record linked to this account');
    }
    return employee;
  }

  async update(
    currentUser: JwtPayload,
    id: string,
    dto: UpdateEmployeeDto,
  ): Promise<Employee> {
    const employee = await this.findOneForUser(currentUser, id);
    const hadEmail = Boolean(employee.email);
    if (dto.email && dto.email !== employee.email) {
      const emailOwner = await this.usersService.findByEmail(dto.email);
      if (emailOwner && emailOwner.id !== employee.userId) {
        throw new ConflictException(
          'A user with this email already exists. Please use a different email.',
        );
      }
    }
    Object.assign(employee, dto);
    const saved = await this.employeesRepository.save(employee);
    if (!hadEmail && saved.email && !saved.userId) {
      await this.sendSetupEmail(saved);
    }
    return saved;
  }

  async remove(currentUser: JwtPayload, id: string): Promise<void> {
    const employee = await this.findOneForUser(currentUser, id);
    await this.employeesRepository.remove(employee);
  }

  /** Emails the public pay/track link to the employee. */
  async sendPaymentLink(
    currentUser: JwtPayload,
    id: string,
  ): Promise<{ message: string }> {
    const employee = await this.findOneForUser(currentUser, id);
    if (!employee.email) {
      throw new BadRequestException('No email address on file for this employee');
    }
    if (!employee.publicToken) {
      throw new BadRequestException('No tracking link is available for this employee');
    }
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const link = `${frontendUrl}/track/${employee.publicToken}`;
    const fee = registrationFeeForVariant(employee.productVariant);
    await this.emailService.sendPaymentLinkEmail(
      employee.email,
      employee.fullName,
      link,
      fee ? `PKR ${fee.toLocaleString('en-PK')}` : undefined,
    );
    return { message: `Payment link sent to ${employee.email}` };
  }

  // ---- EFU queue ----

  async listForEfu(query: EfuEmployeeQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));

    const qb = this.employeesRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.card', 'card')
      .leftJoinAndSelect('employee.company', 'company');

    if (query.status) qb.andWhere('employee.status = :status', { status: query.status });
    if (query.gender) qb.andWhere('employee.gender = :gender', { gender: query.gender });

    const { from, to } = parseDateRange(query.startDate, query.endDate);
    if (from) qb.andWhere('employee.createdAt >= :from', { from });
    if (to) qb.andWhere('employee.createdAt <= :to', { to });

    if (query.search) {
      qb.andWhere(
        '(employee.fullName ILIKE :search OR employee.cnicNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    // EFU only ever sees applications the admin has already approved
    // (payment confirmed). Applications whose payment is still pending or was
    // rejected never reach the EFU queue.
    qb.innerJoin(
      'payments',
      'pay',
      'pay.employeeId = employee.id AND pay.status = :confirmedPayment',
      { confirmedPayment: PaymentStatus.CONFIRMED },
    );

    qb.orderBy('employee.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const paymentMap = await this.paymentsByEmployee(rows.map((r) => r.id));
    const data = rows.map((r) => ({ ...r, payment: paymentMap.get(r.id) ?? null }));

    return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async getForEfu(id: string) {
    const employee = await this.employeesRepository.findOne({
      where: { id },
      relations: { card: true, company: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const payment = await this.paymentsService.getForEmployee(id);
    return {
      ...employee,
      payment: payment ? this.toPaymentSummary(payment) : null,
    };
  }

  private toPaymentSummary(payment: Payment): PaymentSummary {
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      productVariant: payment.productVariant,
      reference: payment.reference,
      proofImageUrl: payment.proofImageUrl,
      rejectionReason: payment.rejectionReason,
      reviewedAt: payment.reviewedAt,
    };
  }

  private async paymentsByEmployee(ids: string[]): Promise<Map<string, PaymentSummary>> {
    if (ids.length === 0) return new Map();
    const payments = await this.paymentsRepository.find({ where: { employeeId: In(ids) } });
    return new Map(payments.map((p) => [p.employeeId as string, this.toPaymentSummary(p)]));
  }

  // ---- EFU decisions (approval gated on a confirmed payment) ----

  async approveByEfu(efuUserId: string, id: string): Promise<Employee> {
    if (!(await this.paymentsService.isConfirmedForEmployee(id))) {
      throw new BadRequestException(
        'Payment must be confirmed before this application can be approved.',
      );
    }
    const employee = await this.findByIdOrThrow(id);
    employee.status = ApplicationStatus.APPROVED;
    employee.reviewedByUserId = efuUserId;
    employee.reviewedAt = new Date();
    employee.reviewNote = null;
    return this.grantCertificateAndCard(employee);
  }

  async rejectByEfu(efuUserId: string, id: string, reason?: string): Promise<Employee> {
    const employee = await this.findByIdOrThrow(id);
    employee.status = ApplicationStatus.REJECTED;
    employee.reviewedByUserId = efuUserId;
    employee.reviewedAt = new Date();
    employee.reviewNote = reason ?? null;
    const saved = await this.employeesRepository.save(employee);
    if (employee.card && employee.card.status !== CardStatus.SUSPENDED) {
      employee.card.status = CardStatus.SUSPENDED;
      employee.card.verificationCode = null;
      employee.card.verificationCodeExpiresAt = null;
      await this.cardsRepository.save(employee.card);
    }
    return saved;
  }

  async requestChangesByEfu(
    efuUserId: string,
    id: string,
    reason: string,
  ): Promise<Employee> {
    const employee = await this.findByIdOrThrow(id);
    employee.status = ApplicationStatus.CHANGES_REQUESTED;
    employee.reviewedByUserId = efuUserId;
    employee.reviewedAt = new Date();
    employee.reviewNote = reason;
    return this.employeesRepository.save(employee);
  }

  /** Issues the certificate and (pending-verification) 16-digit card. */
  private async grantCertificateAndCard(employee: Employee): Promise<Employee> {
    if (!employee.certificateIssued) {
      employee.certificateIssued = true;
      employee.certificateNumber = `EMP-CERT-${randomBytes(4).toString('hex').toUpperCase()}`;
      employee.certificateIssuedAt = new Date();
    }
    const saved = await this.employeesRepository.save(employee);

    const existing = await this.cardsRepository.findOne({
      where: { employeeId: saved.id },
    });
    if (existing) {
      saved.card = existing;
      return saved;
    }

    const issuedAt = new Date();
    const cardNumber = await this.cardsService.generateCardNumber(
      saved.province,
      saved.district,
    );
    const card = this.cardsRepository.create({
      employeeId: saved.id,
      cardNumber,
      status: CardStatus.PENDING_VERIFICATION,
      issuedAt,
      expiresAt: this.cardsService.newCardExpiry(issuedAt),
    });
    saved.card = await this.cardsRepository.save(card);
    return saved;
  }

  private async findByIdOrThrow(id: string): Promise<Employee> {
    const employee = await this.employeesRepository.findOne({
      where: { id },
      relations: { card: true, company: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  private async assertOwnership(
    currentUser: JwtPayload,
    employee: Employee,
  ): Promise<void> {
    if (
      currentUser.role === UserRole.OPERATOR ||
      currentUser.role === UserRole.EFU ||
      currentUser.role === UserRole.ADMIN
    ) {
      return;
    }
    if (currentUser.role === UserRole.CORPORATE) {
      const company = await this.companiesService.findByOwnerUserId(currentUser.sub);
      if (!company || employee.companyId !== company.id) {
        throw new ForbiddenException('You do not have access to this employee record');
      }
      return;
    }
    if (!employee.userId || employee.userId !== currentUser.sub) {
      throw new ForbiddenException('You do not have access to this employee record');
    }
  }
}
