import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Institution } from './entities/institution.entity';
import { Student } from '../students/entities/student.entity';
import { InstitutionApprovalStatus } from './enums/institution-approval-status.enum';
import { InstitutionType } from './enums/institution-type.enum';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

export interface InstitutionAdminFilters {
  status?: InstitutionApprovalStatus;
  search?: string;
}

export interface CreateInstitutionInput {
  ownerUserId: string;
  name: string;
  registrationNumber: string;
  type: InstitutionType;
  address: string;
  city: string;
  contactNumber: string;
  officialEmail: string;
  principalName: string;
  authorizedPersonName: string;
  authorizedPersonDesignation: string;
  authorizedPersonCnic: string;
  authorizedPersonMobile: string;
  numberOfStudents: number;
}

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  createWithManager(
    manager: EntityManager,
    input: CreateInstitutionInput,
  ): Promise<Institution> {
    const institution = manager.create(Institution, input);
    return manager.save(institution);
  }

  async findPending(): Promise<Institution[]> {
    return this.institutionsRepository.find({
      where: { approvalStatus: InstitutionApprovalStatus.PENDING_REVIEW },
      relations: { ownerUser: true },
      select: {
        ownerUser: { id: true, email: true, name: true, phone: true },
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findByOwnerUserId(ownerUserId: string): Promise<Institution | null> {
    return this.institutionsRepository.findOne({ where: { ownerUserId } });
  }

  async findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<Institution | null> {
    return this.institutionsRepository.findOne({
      where: { registrationNumber },
    });
  }

  async findById(id: string): Promise<Institution> {
    const institution = await this.institutionsRepository.findOne({
      where: { id },
    });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }
    return institution;
  }

  async approve(id: string, approvedByUserId: string): Promise<Institution> {
    const institution = await this.findById(id);
    institution.approvalStatus = InstitutionApprovalStatus.APPROVED;
    institution.approvedByUserId = approvedByUserId;
    institution.approvedAt = new Date();
    institution.rejectionReason = null;
    return this.institutionsRepository.save(institution);
  }

  async reject(id: string, reason?: string): Promise<Institution> {
    const institution = await this.findById(id);
    institution.approvalStatus = InstitutionApprovalStatus.REJECTED;
    institution.rejectionReason = reason ?? null;
    return this.institutionsRepository.save(institution);
  }

  async findAllAdmin(
    filters: InstitutionAdminFilters = {},
  ): Promise<Array<Institution & { enrolledStudents: number }>> {
    const qb = this.institutionsRepository
      .createQueryBuilder('institution')
      .leftJoinAndSelect('institution.ownerUser', 'ownerUser');

    if (filters.status) {
      qb.andWhere('institution.approvalStatus = :status', {
        status: filters.status,
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(institution.name ILIKE :search OR institution.registrationNumber ILIKE :search OR institution.city ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('institution.createdAt', 'DESC');
    const institutions = await qb.getMany();

    if (institutions.length === 0) {
      return [];
    }

    const counts = await this.studentsRepository
      .createQueryBuilder('student')
      .select('student.institutionId', 'institutionId')
      .addSelect('COUNT(*)', 'count')
      .where('student.institutionId IN (:...ids)', {
        ids: institutions.map((inst) => inst.id),
      })
      .groupBy('student.institutionId')
      .getRawMany<{ institutionId: string; count: string }>();

    const countByInstitution = new Map(
      counts.map((row) => [row.institutionId, Number(row.count)]),
    );

    return institutions.map((institution) => ({
      ...institution,
      enrolledStudents: countByInstitution.get(institution.id) ?? 0,
    }));
  }

  async update(
    id: string,
    dto: UpdateInstitutionDto,
  ): Promise<Institution> {
    const institution = await this.findById(id);
    Object.assign(institution, dto);
    return this.institutionsRepository.save(institution);
  }

  async updateOwn(
    ownerUserId: string,
    dto: UpdateInstitutionDto,
  ): Promise<Institution> {
    const institution = await this.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }
    Object.assign(institution, dto);
    return this.institutionsRepository.save(institution);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findById(id);
    await this.institutionsRepository.delete(id);
    return { message: 'Institution deleted' };
  }
}
