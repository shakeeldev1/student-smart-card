import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from './entities/claim.entity';
import { CreateClaimDto } from './dto/create-claim.dto';
import { Card } from '../cards/entities/card.entity';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim)
    private readonly claimsRepository: Repository<Claim>,
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
  ) {}

  async createClaim(studentId: string, createClaimDto: CreateClaimDto): Promise<Claim> {
    const card = await this.cardsRepository.findOne({
      where: { cardNumber: createClaimDto.cardNumber },
      relations: { student: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.studentId !== studentId) {
      throw new NotFoundException('This card does not belong to you');
    }

    const claim = this.claimsRepository.create({
      studentId,
      cardNumber: createClaimDto.cardNumber,
      claimType: createClaimDto.claimType,
      dateOfDeath: createClaimDto.dateOfDeath ? new Date(createClaimDto.dateOfDeath) : null,
      dateOfAccidentalDisability: createClaimDto.dateOfAccidentalDisability
        ? new Date(createClaimDto.dateOfAccidentalDisability)
        : null,
    });

    return this.claimsRepository.save(claim);
  }

  async getClaimsByStudent(studentId: string): Promise<Claim[]> {
    return this.claimsRepository.find({
      where: { studentId },
      relations: { student: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getClaimById(claimId: string, studentId: string): Promise<Claim> {
    const claim = await this.claimsRepository.findOne({
      where: { id: claimId, studentId },
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
}
