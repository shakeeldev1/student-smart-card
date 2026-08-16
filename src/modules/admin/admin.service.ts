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
}
