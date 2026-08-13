import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Institution } from './entities/institution.entity';
import { InstitutionApprovalStatus } from './enums/institution-approval-status.enum';
import { InstitutionType } from './enums/institution-type.enum';

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
}
