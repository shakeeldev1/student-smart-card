import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Claim } from './entities/claim.entity';
import { CreateClaimDto } from './dto/create-claim.dto';
import { Card } from '../cards/entities/card.entity';
import { ClaimStatus } from './enums/claim-status.enum';
import { UserRole } from '../users/enums/user-role.enum';

export interface ClaimOwner {
  id: string;
  role: UserRole;
}

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim)
    private readonly claimsRepository: Repository<Claim>,
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
  ) {}

  async createClaim(owner: ClaimOwner, createClaimDto: CreateClaimDto): Promise<Claim> {
    const card = await this.cardsRepository.findOne({
      where: { cardNumber: createClaimDto.cardNumber },
      relations: { student: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const isOwner =
      owner.role === UserRole.STUDENT
        ? card.student.userId === owner.id
        : card.student.registeredByUserId === owner.id;

    if (!isOwner) {
      throw new NotFoundException('This card does not belong to you');
    }

    const claim = this.claimsRepository.create({
      claimNumber: `CLM-${randomBytes(4).toString('hex').toUpperCase()}`,
      studentId: card.studentId,
      cardNumber: createClaimDto.cardNumber,
      claimType: createClaimDto.claimType,
      dateOfDeath: createClaimDto.dateOfDeath ? new Date(createClaimDto.dateOfDeath) : null,
      dateOfAccidentalDisability: createClaimDto.dateOfAccidentalDisability
        ? new Date(createClaimDto.dateOfAccidentalDisability)
        : null,
      placeOfIncident: createClaimDto.placeOfIncident ?? null,
      claimantName: createClaimDto.claimantName,
      claimantRelationship: createClaimDto.claimantRelationship,
      claimantCnic: createClaimDto.claimantCnic,
      claimantContactNumber: createClaimDto.claimantContactNumber,
      claimantSignature: createClaimDto.claimantSignature,
      documentDeathCertificate: createClaimDto.documentDeathCertificate ?? false,
      documentMedicalDisability: createClaimDto.documentMedicalDisability ?? false,
      documentStudentCnicOrBForm: createClaimDto.documentStudentCnicOrBForm ?? false,
      documentClaimantCnic: createClaimDto.documentClaimantCnic ?? false,
      documentStudentCard: createClaimDto.documentStudentCard ?? false,
      documentPoliceReport: createClaimDto.documentPoliceReport ?? false,
    });

    return this.claimsRepository.save(claim);
  }

  async getClaimsForOwner(owner: ClaimOwner): Promise<Claim[]> {
    const where =
      owner.role === UserRole.STUDENT
        ? { student: { userId: owner.id } }
        : { student: { registeredByUserId: owner.id } };

    return this.claimsRepository.find({
      where,
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getClaimByIdForOwner(claimId: string, owner: ClaimOwner): Promise<Claim> {
    const where =
      owner.role === UserRole.STUDENT
        ? { id: claimId, student: { userId: owner.id } }
        : { id: claimId, student: { registeredByUserId: owner.id } };

    const claim = await this.claimsRepository.findOne({
      where,
      relations: { student: true },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    return claim;
  }

  async getClaimByIdNoAuth(claimId: string): Promise<Claim> {
    const claim = await this.claimsRepository.findOne({
      where: { id: claimId },
      relations: { student: true },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    return claim;
  }

  async getAllClaims(): Promise<Claim[]> {
    return this.claimsRepository.find({
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(
    claimId: string,
    status: ClaimStatus,
    notes?: string,
  ): Promise<Claim> {
    const claim = await this.getClaimByIdNoAuth(claimId);
    claim.status = status;
    if (notes !== undefined) {
      claim.notes = notes;
    }
    return this.claimsRepository.save(claim);
  }
}
