import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Institution } from '../institutions/entities/institution.entity';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { Student } from '../students/entities/student.entity';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { Claim } from '../claims/entities/claim.entity';
import { ClaimStatus } from '../claims/enums/claim-status.enum';
import { Individual } from '../individuals/entities/individual.entity';
import { toCsv } from '../../common/utils/csv.util';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Claim)
    private readonly claimsRepository: Repository<Claim>,
    @InjectRepository(Individual)
    private readonly individualsRepository: Repository<Individual>,
  ) {}

  async getStats() {
    const [
      totalUsers,
      operators,
      institutions,
      students,
      claims,
      pendingInstitutions,
      pendingStudents,
    ] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { role: UserRole.OPERATOR } }),
      this.institutionsRepository.count({
        where: { approvalStatus: InstitutionApprovalStatus.APPROVED },
      }),
      this.studentsRepository.count(),
      this.claimsRepository.count(),
      this.institutionsRepository.count({
        where: { approvalStatus: InstitutionApprovalStatus.PENDING_REVIEW },
      }),
      this.studentsRepository.count({
        where: { status: ApplicationStatus.PENDING },
      }),
    ]);

    return {
      totalUsers,
      operators,
      institutions,
      students,
      claims,
      pendingApprovals: pendingInstitutions + pendingStudents,
    };
  }

  /**
   * Rich, system-wide analytics for the admin dashboard: headline totals,
   * users-by-role, student/institution/claim status breakdowns, certificate
   * coverage, top schools, a 6-month registration trend and recent students.
   */
  async getAnalytics() {
    const [
      totals,
      usersByRoleRows,
      studentStatusRows,
      institutionStatusRows,
      claimStatusRows,
      certificateIssued,
      individuals,
      topSchoolRows,
      trendRows,
      recentStudents,
    ] = await Promise.all([
      this.getStats(),
      this.usersRepository
        .createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('u.role')
        .getRawMany<{ role: string; count: string }>(),
      this.studentsRepository
        .createQueryBuilder('s')
        .select('s.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('s.status')
        .getRawMany<{ status: string; count: string }>(),
      this.institutionsRepository
        .createQueryBuilder('i')
        .select('i.approvalStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('i.approvalStatus')
        .getRawMany<{ status: string; count: string }>(),
      this.claimsRepository
        .createQueryBuilder('c')
        .select('c.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('c.status')
        .getRawMany<{ status: string; count: string }>(),
      this.studentsRepository.count({ where: { certificateIssued: true } }),
      this.individualsRepository.count(),
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
        .groupBy(`to_char("student"."createdAt", 'YYYY-MM')`)
        .orderBy(`to_char("student"."createdAt", 'YYYY-MM')`, 'ASC')
        .getRawMany<{ month: string; count: string }>(),
      this.studentsRepository.find({
        relations: { institution: true },
        order: { createdAt: 'DESC' },
        take: 6,
      }),
    ]);

    const asCount = (rows: Array<Record<string, string>>, key: string, value: string) =>
      Number(rows.find((r) => r[key] === value)?.count ?? 0);

    const usersByRole = {
      school: asCount(usersByRoleRows, 'role', UserRole.SCHOOL),
      student: asCount(usersByRoleRows, 'role', UserRole.STUDENT),
      individual: asCount(usersByRoleRows, 'role', UserRole.INDIVIDUAL),
      operator: asCount(usersByRoleRows, 'role', UserRole.OPERATOR),
      efu: asCount(usersByRoleRows, 'role', UserRole.EFU),
      admin: asCount(usersByRoleRows, 'role', UserRole.ADMIN),
    };

    const studentStatus = {
      pending: asCount(studentStatusRows, 'status', ApplicationStatus.PENDING),
      approved: asCount(studentStatusRows, 'status', ApplicationStatus.APPROVED),
      changes_requested: asCount(studentStatusRows, 'status', ApplicationStatus.CHANGES_REQUESTED),
      rejected: asCount(studentStatusRows, 'status', ApplicationStatus.REJECTED),
    };

    const institutionStatus = {
      pending_review: asCount(institutionStatusRows, 'status', InstitutionApprovalStatus.PENDING_REVIEW),
      approved: asCount(institutionStatusRows, 'status', InstitutionApprovalStatus.APPROVED),
      rejected: asCount(institutionStatusRows, 'status', InstitutionApprovalStatus.REJECTED),
    };

    const claimStatus = {
      pending: asCount(claimStatusRows, 'status', ClaimStatus.PENDING),
      under_review: asCount(claimStatusRows, 'status', ClaimStatus.UNDER_REVIEW),
      approved: asCount(claimStatusRows, 'status', ClaimStatus.APPROVED),
      rejected: asCount(claimStatusRows, 'status', ClaimStatus.REJECTED),
    };

    const notIssued = totals.students - certificateIssued;
    const certificate = {
      issued: certificateIssued,
      notIssued: notIssued < 0 ? 0 : notIssued,
      rate: totals.students ? Math.round((certificateIssued / totals.students) * 100) : 0,
    };

    const trendMap = new Map(trendRows.map((r) => [r.month, Number(r.count)]));
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
      totals: { ...totals, individuals },
      usersByRole,
      studentStatus,
      institutionStatus,
      claimStatus,
      certificate,
      topSchools: topSchoolRows.map((r) => ({ id: r.id, name: r.name, count: Number(r.count) })),
      monthlyTrend,
      recentStudents: recentStudents.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        bFormNumber: s.bFormNumber,
        className: s.className,
        status: s.status,
        institutionName: s.institution?.name ?? s.institutionNameFreeText ?? null,
        createdAt: s.createdAt,
      })),
    };
  }

  async getStudentsReportCsv(): Promise<string> {
    const students = await this.studentsRepository.find({
      relations: { institution: true },
      order: { createdAt: 'DESC' },
    });

    return toCsv(
      [
        'Full Name',
        'B-Form Number',
        'Class',
        'Institution',
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

  async getInstitutionsReportCsv(): Promise<string> {
    const institutions = await this.institutionsRepository.find({
      relations: { ownerUser: true },
      order: { createdAt: 'DESC' },
    });

    const counts = await this.studentsRepository
      .createQueryBuilder('student')
      .select('student.institutionId', 'institutionId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('student.institutionId')
      .getRawMany<{ institutionId: string; count: string }>();
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
        'Official Email',
        'Approval Status',
        'Enrolled Students',
        'Owner Email',
        'Registered At',
      ],
      institutions.map((inst) => [
        inst.name,
        inst.registrationNumber,
        inst.type,
        inst.city,
        inst.principalName,
        inst.officialEmail,
        inst.approvalStatus,
        countByInstitution.get(inst.id) ?? 0,
        inst.ownerUser?.email ?? '',
        inst.createdAt.toISOString(),
      ]),
    );
  }

  async getClaimsReportCsv(): Promise<string> {
    const claims = await this.claimsRepository.find({
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });

    return toCsv(
      [
        'Claim Number',
        'Card Number',
        'Student Name',
        'Claim Type',
        'Status',
        'Date of Death',
        'Date of Accidental Disability',
        'Place of Incident',
        'Claimant Name',
        'Claimant Relationship',
        'Claimant CNIC',
        'Claimant Contact',
        'Notes',
        'Submitted At',
      ],
      claims.map((c) => [
        c.claimNumber ?? '',
        c.cardNumber,
        c.student?.fullName ?? '',
        c.claimType,
        c.status,
        c.dateOfDeath ? new Date(c.dateOfDeath).toISOString() : '',
        c.dateOfAccidentalDisability
          ? new Date(c.dateOfAccidentalDisability).toISOString()
          : '',
        c.placeOfIncident ?? '',
        c.claimantName ?? '',
        c.claimantRelationship ?? '',
        c.claimantCnic ?? '',
        c.claimantContactNumber ?? '',
        c.notes ?? '',
        c.createdAt.toISOString(),
      ]),
    );
  }

  async getPendingApprovalsReportCsv(): Promise<string> {
    const [pendingInstitutions, pendingStudents] = await Promise.all([
      this.institutionsRepository.find({
        where: { approvalStatus: InstitutionApprovalStatus.PENDING_REVIEW },
        order: { createdAt: 'ASC' },
      }),
      this.studentsRepository.find({
        where: { status: ApplicationStatus.PENDING },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const rows: Array<Array<string | number>> = [
      ...pendingInstitutions.map((inst) => [
        'Institution',
        inst.name,
        inst.registrationNumber,
        inst.createdAt.toISOString(),
      ]),
      ...pendingStudents.map((s) => [
        'Student',
        s.fullName,
        s.bFormNumber,
        s.createdAt.toISOString(),
      ]),
    ];

    return toCsv(['Type', 'Name', 'Reference', 'Submitted At'], rows);
  }
}
