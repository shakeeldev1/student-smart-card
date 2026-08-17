import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '../institutions/entities/institution.entity';
import { InstitutionApprovalStatus } from '../institutions/enums/institution-approval-status.enum';
import { SchoolClass } from '../classes/entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { ApplicationStatus } from '../students/enums/application-status.enum';
import { toCsv } from '../../common/utils/csv.util';
import { parseDateRange } from '../../common/utils/date-range.util';

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
