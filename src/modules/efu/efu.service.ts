import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '../institutions/entities/institution.entity';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { SchoolClass } from '../classes/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { Gender } from '../students/enums/gender.enum';
import { toCsv } from '../../common/utils/csv.util';
import { parseDateRange } from '../../common/utils/date-range.util';

export interface EfuStudentQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  certificateStatus?: 'issued' | 'not_issued';
  institutionId?: string;
  classId?: string;
  gender?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedStudents {
  data: Student[];
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
  ) {}

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

    qb.orderBy('student.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getStudentById(id: string): Promise<Student> {
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
    return student;
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
}
