import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from '../cards/entities/card.entity';
import { CardStatus } from '../cards/enums/card-status.enum';
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { CardHolderProfileResponseDto } from './dto/card-holder-profile-response.dto';

/**
 * Read-only lookups for the e-commerce integration (SSC). Deliberately kept
 * separate from CardsService/StudentsService/IndividualsService so this new
 * integration surface cannot affect any existing behavior in this app.
 */
@Injectable()
export class EcommerceIntegrationService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @InjectRepository(IndividualCard)
    private readonly individualCardsRepository: Repository<IndividualCard>,
  ) {}

  async getActiveCardHolderProfile(
    cardNumber: string,
  ): Promise<CardHolderProfileResponseDto | null> {
    const studentCard = await this.cardsRepository.findOne({
      where: { cardNumber },
      relations: { student: { institution: true, section: true } },
    });

    if (studentCard) {
      if (studentCard.status !== CardStatus.ACTIVE || !studentCard.student) {
        return null;
      }
      const student = studentCard.student;

      return {
        cardNumber: studentCard.cardNumber,
        cardStatus: studentCard.status,
        holderType: 'student',
        fullName: student.fullName,
        email: student.email,
        contactNumber: student.contactNumber,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        photoUrl: student.photoUrl,
        // Parent-registered students have no institution row, only the
        // free-text school name they typed.
        institutionName:
          student.institution?.name ?? student.institutionNameFreeText ?? null,
        className: student.className,
        issuedAt: studentCard.issuedAt,
        expiresAt: studentCard.expiresAt,
        institutionVerified: Boolean(student.institution),
        institutionLogoUrl: student.institution?.logoUrl ?? null,
        sectionName: student.section?.name ?? null,
        rollNumber: student.rollNumber,
      };
    }

    const individualCard = await this.individualCardsRepository.findOne({
      where: { cardNumber },
      relations: { individual: { user: true } },
    });

    if (individualCard) {
      if (
        individualCard.status !== CardStatus.ACTIVE ||
        !individualCard.individual
      ) {
        return null;
      }
      const individual = individualCard.individual;

      return {
        cardNumber: individualCard.cardNumber,
        cardStatus: individualCard.status,
        holderType: 'individual',
        fullName: individual.fullName,
        email: individual.email ?? individual.user?.email ?? null,
        contactNumber: individual.contactNumber,
        dateOfBirth: individual.dateOfBirth,
        gender: individual.gender,
        photoUrl: individual.photoUrl,
        institutionName: null,
        className: null,
        issuedAt: individualCard.issuedAt,
        expiresAt: individualCard.expiresAt,
        institutionVerified: false,
        institutionLogoUrl: null,
        sectionName: null,
        rollNumber: null,
      };
    }

    return null;
  }
}
