import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from './entities/claim.entity';
import { CreateClaimDto } from './dto/create-claim.dto';
import { Card } from '../cards/entities/card.entity';
import { ClaimStatus } from './enums/claim-status.enum';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim)
    private readonly claimsRepository: Repository<Claim>,
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
  ) {}

  async createClaim(parentUserId: string, createClaimDto: CreateClaimDto): Promise<Claim> {
    const card = await this.cardsRepository.findOne({
      where: { cardNumber: createClaimDto.cardNumber },
      relations: { student: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.student.registeredByUserId !== parentUserId) {
      throw new NotFoundException('This card does not belong to you');
    }

    const claim = this.claimsRepository.create({
      studentId: card.studentId,
      cardNumber: createClaimDto.cardNumber,
      claimType: createClaimDto.claimType,
      dateOfDeath: createClaimDto.dateOfDeath ? new Date(createClaimDto.dateOfDeath) : null,
      dateOfAccidentalDisability: createClaimDto.dateOfAccidentalDisability
        ? new Date(createClaimDto.dateOfAccidentalDisability)
        : null,
    });

    return this.claimsRepository.save(claim);
  }

  async getClaimsForParent(parentUserId: string): Promise<Claim[]> {
    return this.claimsRepository.find({
      where: { student: { registeredByUserId: parentUserId } },
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getClaimByIdForParent(claimId: string, parentUserId: string): Promise<Claim> {
    const claim = await this.claimsRepository.findOne({
      where: { id: claimId, student: { registeredByUserId: parentUserId } },
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
