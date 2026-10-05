import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { Card } from './entities/card.entity';
import { IndividualCard } from '../individuals/entities/individual-card.entity';
import { EmployeeCard } from '../corporate/entities/employee-card.entity';
import { GoldenCardNumber } from './entities/golden-card-number.entity';
import { GOLDEN_EXAMPLES, isGoldenSuffix } from './golden-number.util';

type CardKind = 'student' | 'individual' | 'employee';

@Injectable()
export class GoldenNumbersService {
  constructor(
    @InjectRepository(GoldenCardNumber)
    private readonly goldenRepository: Repository<GoldenCardNumber>,
    @InjectRepository(Card)
    private readonly cardsRepository: Repository<Card>,
    @InjectRepository(IndividualCard)
    private readonly individualCardsRepository: Repository<IndividualCard>,
    @InjectRepository(EmployeeCard)
    private readonly employeeCardsRepository: Repository<EmployeeCard>,
  ) {}

  private normalize(suffix: string): string {
    return (suffix ?? '').trim();
  }

  /** The admin dashboard overview: assigned golden cards + pattern examples. */
  async getOverview() {
    const assigned = await this.goldenRepository.find({
      order: { assignedAt: 'DESC' },
    });
    return { assigned, assignedCount: assigned.length, examples: GOLDEN_EXAMPLES };
  }

  /** Is this suffix a golden pattern, and is it still free to give out? */
  async validate(suffixRaw: string) {
    const suffix = this.normalize(suffixRaw);
    const isGolden = isGoldenSuffix(suffix);
    if (!isGolden) {
      return { suffix, isGolden: false, available: false, reason: 'Not a golden pattern' };
    }
    const taken = await this.goldenRepository.findOne({ where: { suffix } });
    if (taken) {
      return { suffix, isGolden: true, available: false, reason: 'Already assigned' };
    }
    if (await this.anyCardEndsWith(suffix)) {
      return { suffix, isGolden: true, available: false, reason: 'A card already uses this number' };
    }
    return { suffix, isGolden: true, available: true, reason: null };
  }

  /** Holder info for a card number, so the admin can confirm before assigning. */
  async lookupCard(cardNumber: string) {
    const found = await this.findCard(this.normalize(cardNumber));
    if (!found) {
      throw new NotFoundException('No card found with this number');
    }
    return {
      cardNumber: found.card.cardNumber,
      holderName: found.holderName,
      cardType: found.kind,
      status: found.card.status,
    };
  }

  async assign(
    adminId: string,
    cardNumberRaw: string,
    suffixRaw: string,
    note?: string,
  ): Promise<GoldenCardNumber> {
    const cardNumber = this.normalize(cardNumberRaw);
    const suffix = this.normalize(suffixRaw);

    if (!isGoldenSuffix(suffix)) {
      throw new BadRequestException('That is not a golden card number.');
    }
    const existingGolden = await this.goldenRepository.findOne({ where: { suffix } });
    if (existingGolden) {
      throw new ConflictException('This golden number is already assigned to someone.');
    }

    const target = await this.findCard(cardNumber);
    if (!target) {
      throw new NotFoundException('No card found with this number.');
    }

    // Keep the holder's 7727 + province + district prefix; swap only the suffix.
    const newNumber = target.card.cardNumber.slice(0, 8) + suffix;
    if (newNumber === target.card.cardNumber) {
      // Already using this number — just record the assignment.
    } else if (await this.anyCardEndsWith(suffix)) {
      throw new ConflictException('Another card already uses this number.');
    }

    return this.goldenRepository.manager.transaction(async (manager) => {
      target.card.cardNumber = newNumber;
      await manager.save(target.card);
      const row = manager.create(GoldenCardNumber, {
        suffix,
        cardNumber: newNumber,
        cardType: target.kind,
        holderName: target.holderName,
        assignedByUserId: adminId,
        note: note?.trim() || null,
      });
      return manager.save(row);
    });
  }

  /** Frees a golden number: the card is re-numbered with a fresh random suffix. */
  async unassign(suffixRaw: string): Promise<{ message: string }> {
    const suffix = this.normalize(suffixRaw);
    const row = await this.goldenRepository.findOne({ where: { suffix } });
    if (!row) {
      throw new NotFoundException('This golden number is not assigned.');
    }

    const target = await this.findCard(row.cardNumber);
    await this.goldenRepository.manager.transaction(async (manager) => {
      if (target) {
        const prefix = target.card.cardNumber.slice(0, 8);
        target.card.cardNumber = await this.rollRandomNumber(prefix);
        await manager.save(target.card);
      }
      await manager.remove(row);
    });
    return { message: `Golden number ${suffix} is now available again.` };
  }

  // ---- helpers ----

  private async findCard(cardNumber: string): Promise<
    | { kind: CardKind; card: Card | IndividualCard | EmployeeCard; holderName: string | null }
    | null
  > {
    const normalized = cardNumber.trim().toUpperCase();
    if (!normalized) return null;

    const student = await this.cardsRepository.findOne({
      where: { cardNumber: normalized },
      relations: { student: true },
    });
    if (student) {
      return { kind: 'student', card: student, holderName: student.student?.fullName ?? null };
    }
    const individual = await this.individualCardsRepository.findOne({
      where: { cardNumber: normalized },
      relations: { individual: true },
    });
    if (individual) {
      return { kind: 'individual', card: individual, holderName: individual.individual?.fullName ?? null };
    }
    const employee = await this.employeeCardsRepository.findOne({
      where: { cardNumber: normalized },
      relations: { employee: true },
    });
    if (employee) {
      return { kind: 'employee', card: employee, holderName: employee.employee?.fullName ?? null };
    }
    return null;
  }

  private async anyCardEndsWith(suffix: string): Promise<boolean> {
    const pattern = `%${suffix}`;
    const [s, i, e] = await Promise.all([
      this.cardsRepository
        .createQueryBuilder('c')
        .where('c.cardNumber LIKE :pattern', { pattern })
        .getCount(),
      this.individualCardsRepository
        .createQueryBuilder('c')
        .where('c.cardNumber LIKE :pattern', { pattern })
        .getCount(),
      this.employeeCardsRepository
        .createQueryBuilder('c')
        .where('c.cardNumber LIKE :pattern', { pattern })
        .getCount(),
    ]);
    return s + i + e > 0;
  }

  private async cardNumberExists(fullNumber: string): Promise<boolean> {
    const [s, i, e] = await Promise.all([
      this.cardsRepository.findOne({ where: { cardNumber: fullNumber } }),
      this.individualCardsRepository.findOne({ where: { cardNumber: fullNumber } }),
      this.employeeCardsRepository.findOne({ where: { cardNumber: fullNumber } }),
    ]);
    return Boolean(s || i || e);
  }

  private async rollRandomNumber(prefix: string): Promise<string> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const random8 = String(randomInt(0, 100_000_000)).padStart(8, '0');
      if (isGoldenSuffix(random8)) continue;
      const full = `${prefix}${random8}`;
      if (!(await this.cardNumberExists(full))) return full;
    }
    throw new BadRequestException('Could not generate a replacement card number.');
  }
}
