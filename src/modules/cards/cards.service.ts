import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Card } from './entities/card.entity';
import { CardStatus } from './enums/card-status.enum';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
  ) {}

  async issueForStudent(studentId: string): Promise<Card> {
    const existing = await this.cardsRepository.findOne({
      where: { studentId },
    });
    if (existing) {
      return existing;
    }

    const card = this.cardsRepository.create({
      studentId,
      cardNumber: `CARD-${randomBytes(4).toString('hex').toUpperCase()}`,
      status: CardStatus.ACTIVE,
      issuedAt: new Date(),
    });
    return this.cardsRepository.save(card);
  }

  async findByCardNumber(cardNumber: string): Promise<Card | null> {
    return this.cardsRepository.findOne({
      where: { cardNumber },
      relations: { student: true },
    });
  }
}
