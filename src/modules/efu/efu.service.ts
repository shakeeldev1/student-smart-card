import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Institution } from '../institutions/entities/institution.entity';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { SchoolClass } from '../classes/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { Gender } from '../students/enums/gender.enum';
import { StudentsService } from '../students/students.service';
import { IndividualsService } from '../individuals/individuals.service';
import { PaymentsService } from '../payments/payments.service';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { toCsv } from '../../common/utils/csv.util';
import { parseDateRange } from '../../common/utils/date-range.util';

export interface PaymentSummary {
  id: string;
  status: PaymentStatus;
  amount: number;
  reference: string | null;
  proofImageUrl: string | null;
  rejectionReason: string | null;
  reviewedAt: Date | null;
}

export type StudentWithPayment = Student & { payment: PaymentSummary | null };
export type IndividualWithPayment = Individual & { payment: PaymentSummary | null };

export interface EfuStudentQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  certificateStatus?: 'issued' | 'not_issued';
  institutionId?: string;
  classId?: string;
  sectionId?: string;
  gender?: string;
  startDate?: string;
  endDate?: string;
  /** EFU queue filter: only applications whose payment is in this state. */
  paymentStatus?: PaymentStatus;
}

export interface PaginatedStudents {
  data: StudentWithPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EfuIndividualQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  gender?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: PaymentStatus;
}

export interface PaginatedIndividuals {
  data: IndividualWithPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 15;

@Injectable()
export class EfuService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(SchoolClass)
    private readonly classesRepository: Repository<SchoolClass>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Individual)
    private readonly individualsRepository: Repository<Individual>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly studentsService: StudentsService,
    private readonly individualsService: IndividualsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private toPaymentSummary(payment: Payment): PaymentSummary {
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      reference: payment.reference,
      proofImageUrl: payment.proofImageUrl,
      rejectionReason: payment.rejectionReason,
      reviewedAt: payment.reviewedAt,
    };
  }

  /** Batch-loads the payment for each student id and returns a map. */
  private async paymentsByStudent(ids: string[]): Promise<Map<string, PaymentSummary>> {
    if (ids.length === 0) return new Map();
    const payments = await this.paymentsRepository.find({ where: { studentId: In(ids) } });
    return new Map(payments.map((p) => [p.studentId as string, this.toPaymentSummary(p)]));
  }

  private async paymentsByIndividual(ids: string[]): Promise<Map<string, PaymentSummary>> {
    if (ids.length === 0) return new Map();
    const payments = await this.paymentsRepository.find({ where: { individualId: In(ids) } });
    return new Map(payments.map((p) => [p.individualId as string, this.toPaymentSummary(p)]));
  }

  async getStats() {
    const [schools, classes, students, certificatesIssued, pendingApplications] =
      await Promise.all([
        this.institutionsRepository.count({
          where: { approvalStatus: InstitutionApprovalStatus.APPROVED },
        }),
        this.classesRepository.count(),
        this.studentsRepository.count(),
        this.studentsRepository.count({ where: { certificateIssued: true } }),
        this.studentsRepository.count({
          where: { status: ApplicationStatus.PENDING },
        }),
      ]);

    return { schools, classes, students, certificatesIssued, pendingApplications };
  }

  /**
   * Real-time analytics for the EFU dashboard: headline totals plus
   * status / gender / certificate / card breakdowns, top schools by
   * enrollment, a 6-month registration trend, and the latest registrations.
   */
  async getAnalytics() {
    const [
      totals,
      statusRows,
      genderRows,
      cardRows,
      certificateIssued,
      topSchoolRows,
      trendRows,
      recentStudents,
    ] = await Promise.all([
      this.getStats(),
      this.studentsRepository
        .createQueryBuilder('student')
        .select('student.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('student.status')
        .getRawMany<{ status: string; count: string }>(),
      this.studentsRepository
        .createQueryBuilder('student')
        .select('student.gender', 'gender')
        .addSelect('COUNT(*)', 'count')
        .groupBy('student.gender')
        .getRawMany<{ gender: string; count: string }>(),
      this.studentsRepository
        .createQueryBuilder('student')
        .leftJoin('student.card', 'card')
        .select(`COALESCE("card"."status"::text, 'no_card')`, 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy(`COALESCE("card"."status"::text, 'no_card')`)
        .getRawMany<{ status: string; count: string }>(),
      this.studentsRepository.count({ where: { certificateIssued: true } }),
      this.studentsRepository
        .createQueryBuilder('student')
        .innerJoin('student.institution', 'institution')
        .select('institution.id', 'id')
        .addSelect('institution.name', 'name')
        .addSelect('COUNT(*)', 'count')
        .groupBy('institution.id')
        .addGroupBy('institution.name')
        .orderBy('count', 'DESC')
        .limit(8)
        .getRawMany<{ id: string; name: string; count: string }>(),
      this.studentsRepository
        .createQueryBuilder('student')
        .select(`to_char("student"."createdAt", 'YYYY-MM')`, 'month')
        .addSelect('COUNT(*)', 'count')
        .where(`"student"."createdAt" >= (date_trunc('month', now()) - interval '5 months')`)
        .groupBy('month')
        .orderBy('month', 'ASC')
        .getRawMany<{ month: string; count: string }>(),
      this.studentsRepository.find({
        relations: { institution: true },
        order: { createdAt: 'DESC' },
        take: 6,
      }),
    ]);

    const asCount = (
      rows: Array<Record<string, string>>,
      key: string,
      value: string,
    ) => Number(rows.find((row) => row[key] === value)?.count ?? 0);

    const statusBreakdown = {
      pending: asCount(statusRows, 'status', ApplicationStatus.PENDING),
      approved: asCount(statusRows, 'status', ApplicationStatus.APPROVED),
      changes_requested: asCount(statusRows, 'status', ApplicationStatus.CHANGES_REQUESTED),
      rejected: asCount(statusRows, 'status', ApplicationStatus.REJECTED),
    };

    const genderBreakdown = {
      male: asCount(genderRows, 'gender', Gender.MALE),
      female: asCount(genderRows, 'gender', Gender.FEMALE),
    };

    const cardBreakdown = {
      active: asCount(cardRows, 'status', 'active'),
      pending_verification: asCount(cardRows, 'status', 'pending_verification'),
      suspended: asCount(cardRows, 'status', 'suspended'),
      expired: asCount(cardRows, 'status', 'expired'),
      no_card: asCount(cardRows, 'status', 'no_card'),
    };

    const notIssued = totals.students - certificateIssued;
    const certificate = {
      issued: certificateIssued,
      notIssued: notIssued < 0 ? 0 : notIssued,
      rate: totals.students ? Math.round((certificateIssued / totals.students) * 100) : 0,
    };

    // Fill any gap months so the trend is always a continuous 6-point series.
    const trendMap = new Map(trendRows.map((row) => [row.month, Number(row.count)]));
    const monthlyTrend: Array<{ month: string; count: number }> = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() - 5);
    for (let i = 0; i < 6; i += 1) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend.push({ month: key, count: trendMap.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      totals,
      statusBreakdown,
      genderBreakdown,
      cardBreakdown,
      certificate,
      topSchools: topSchoolRows.map((row) => ({
        id: row.id,
        name: row.name,
        count: Number(row.count),
      })),
      monthlyTrend,
      recentStudents: recentStudents.map((student) => ({
        id: student.id,
        fullName: student.fullName,
        bFormNumber: student.bFormNumber,
        className: student.className,
        status: student.status,
        institutionName:
          student.institution?.name ?? student.institutionNameFreeText ?? null,
        createdAt: student.createdAt,
      })),
    };
  }

  async listStudents(query: EfuStudentQuery): Promise<PaginatedStudents> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));

    const qb = this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.card', 'card')
      .leftJoinAndSelect('student.institution', 'institution')
      .leftJoinAndSelect('student.schoolClass', 'schoolClass')
      .leftJoinAndSelect('student.section', 'section');

    if (query.institutionId) {
      qb.andWhere('student.institutionId = :institutionId', {
        institutionId: query.institutionId,
      });
    }
    if (query.classId) {
      qb.andWhere('student.classId = :classId', { classId: query.classId });
    }
    if (query.sectionId) {
      qb.andWhere('student.sectionId = :sectionId', { sectionId: query.sectionId });
    }
    if (query.gender) {
      qb.andWhere('student.gender = :gender', { gender: query.gender });
    }
    if (query.status) {
      qb.andWhere('student.status = :status', { status: query.status });
    }
    if (query.certificateStatus === 'issued') {
      qb.andWhere('student.certificateIssued = true');
    } else if (query.certificateStatus === 'not_issued') {
      qb.andWhere('student.certificateIssued = false');
    }

    const { from, to } = parseDateRange(query.startDate, query.endDate);
    if (from) qb.andWhere('student.createdAt >= :from', { from });
    if (to) qb.andWhere('student.createdAt <= :to', { to });

    if (query.search) {
      qb.andWhere(
        '(student.fullName ILIKE :search OR student.guardianName ILIKE :search OR student.bFormNumber ILIKE :search OR student.rollNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // EFU only ever sees applications the admin has already approved
    // (payment confirmed). Unpaid / unverified applications never reach the queue.
    qb.innerJoin(
      'payments',
      'pay',
      'pay.studentId = student.id AND pay.status = :confirmedPayment',
      { confirmedPayment: PaymentStatus.CONFIRMED },
    );

    qb.orderBy('student.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const paymentMap = await this.paymentsByStudent(rows.map((s) => s.id));
    const data: StudentWithPayment[] = rows.map((s) => ({
      ...s,
      payment: paymentMap.get(s.id) ?? null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getStudentById(id: string): Promise<StudentWithPayment> {
    const student = await this.studentsRepository.findOne({
      where: { id },
      relations: {
        card: true,
        institution: true,
        schoolClass: true,
        section: true,
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    const payment = await this.paymentsService.getForStudent(student.id);
    return { ...student, payment: payment ? this.toPaymentSummary(payment) : null };
  }

  async getStudentsReportCsv(startDate?: string, endDate?: string): Promise<string> {
    const { from, to } = parseDateRange(startDate, endDate);

    const qb = this.studentsRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.institution', 'institution')
      .orderBy('student.createdAt', 'DESC');

    if (from) qb.andWhere('student.createdAt >= :from', { from });
    if (to) qb.andWhere('student.createdAt <= :to', { to });

    const students = await qb.getMany();

    return toCsv(
      [
        'Full Name',
        'B-Form Number',
        'Class',
        'School',
        'Guardian Name',
        'Guardian Mobile',
        'Status',
        'Certificate Issued',
        'Certificate Number',
        'Registered At',
      ],
      students.map((s) => [
        s.fullName,
        s.bFormNumber,
        s.className,
        s.institution?.name ?? s.institutionNameFreeText ?? '',
        s.guardianName,
        s.guardianMobile ?? '',
        s.status,
        s.certificateIssued ? 'Yes' : 'No',
        s.certificateNumber ?? '',
        s.createdAt.toISOString(),
      ]),
    );
  }

  async getSchoolsReportCsv(startDate?: string, endDate?: string): Promise<string> {
    const { from, to } = parseDateRange(startDate, endDate);

    const qb = this.institutionsRepository
      .createQueryBuilder('institution')
      .orderBy('institution.createdAt', 'DESC');

    if (from) qb.andWhere('institution.createdAt >= :from', { from });
    if (to) qb.andWhere('institution.createdAt <= :to', { to });

    const institutions = await qb.getMany();

    const counts = institutions.length
      ? await this.studentsRepository
          .createQueryBuilder('student')
          .select('student.institutionId', 'institutionId')
          .addSelect('COUNT(*)', 'count')
          .where('student.institutionId IN (:...ids)', {
            ids: institutions.map((inst) => inst.id),
          })
          .groupBy('student.institutionId')
          .getRawMany<{ institutionId: string; count: string }>()
      : [];
    const countByInstitution = new Map(
      counts.map((row) => [row.institutionId, Number(row.count)]),
    );

    return toCsv(
      [
        'Name',
        'Registration Number',
        'Type',
        'City',
        'Principal Name',
        'Approval Status',
        'Enrolled Students',
        'Registered At',
      ],
      institutions.map((inst) => [
        inst.name,
        inst.registrationNumber,
        inst.type,
        inst.city,
        inst.principalName,
        inst.approvalStatus,
        countByInstitution.get(inst.id) ?? 0,
        inst.createdAt.toISOString(),
      ]),
    );
  }

  // ---- EFU individuals queue ----

  async listIndividuals(query: EfuIndividualQuery): Promise<PaginatedIndividuals> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));

    const qb = this.individualsRepository.createQueryBuilder('individual');
    if (query.status) qb.andWhere('individual.status = :status', { status: query.status });
    if (query.gender) qb.andWhere('individual.gender = :gender', { gender: query.gender });

    const { from, to } = parseDateRange(query.startDate, query.endDate);
    if (from) qb.andWhere('individual.createdAt >= :from', { from });
    if (to) qb.andWhere('individual.createdAt <= :to', { to });

    if (query.search) {
      qb.andWhere(
        '(individual.fullName ILIKE :search OR individual.cnicNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    // EFU only ever sees applications the admin has already approved
    // (payment confirmed). Unpaid / unverified applications never reach the queue.
    qb.innerJoin(
      'payments',
      'pay',
      'pay.individualId = individual.id AND pay.status = :confirmedPayment',
      { confirmedPayment: PaymentStatus.CONFIRMED },
    );

    qb.orderBy('individual.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const paymentMap = await this.paymentsByIndividual(rows.map((r) => r.id));
    const data: IndividualWithPayment[] = rows.map((r) => ({
      ...r,
      payment: paymentMap.get(r.id) ?? null,
    }));

    return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async getIndividualById(id: string): Promise<IndividualWithPayment> {
    const individual = await this.individualsRepository.findOne({
      where: { id },
      relations: { card: true },
    });
    if (!individual) {
      throw new NotFoundException('Individual not found');
    }
    const payment = await this.paymentsService.getForIndividual(id);
    return { ...individual, payment: payment ? this.toPaymentSummary(payment) : null };
  }

  // ---- EFU decisions (approval is gated on a confirmed payment) ----

  async approveStudent(efuUserId: string, id: string): Promise<Student> {
    if (!(await this.paymentsService.isConfirmedForStudent(id))) {
      throw new BadRequestException('Payment must be confirmed before this application can be approved.');
    }
    return this.studentsService.approve(efuUserId, id);
  }

  rejectStudent(efuUserId: string, id: string, reason?: string): Promise<Student> {
    return this.studentsService.reject(efuUserId, id, reason);
  }

  requestStudentChanges(efuUserId: string, id: string, reason: string): Promise<Student> {
    return this.studentsService.requestChanges(efuUserId, id, reason);
  }

  async approveIndividual(efuUserId: string, id: string): Promise<Individual> {
    if (!(await this.paymentsService.isConfirmedForIndividual(id))) {
      throw new BadRequestException('Payment must be confirmed before this application can be approved.');
    }
    return this.individualsService.approve(efuUserId, id);
  }

  rejectIndividual(efuUserId: string, id: string, reason?: string): Promise<Individual> {
    return this.individualsService.reject(efuUserId, id, reason);
  }

  requestIndividualChanges(efuUserId: string, id: string, reason: string): Promise<Individual> {
    return this.individualsService.requestChanges(efuUserId, id, reason);
  }
}
