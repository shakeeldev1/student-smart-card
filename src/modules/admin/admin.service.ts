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
