import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { Employee } from '../corporate/entities/employee.entity';
import { FranchiseSettings } from '../area/entities/franchise-settings.entity';
import { CommissionRate } from './entities/commission-rate.entity';
import { CommissionPayout } from './entities/commission-payout.entity';
import {
  CommissionChannel,
  COMMISSION_CHANNELS,
} from './enums/commission-channel.enum';

export interface PartnerCommissionSummary {
  earned: number;
  paid: number;
  outstanding: number;
  confirmedCount: number;
}

const EMPTY_SUMMARY: PartnerCommissionSummary = {
  earned: 0,
  paid: 0,
  outstanding: 0,
  confirmedCount: 0,
};

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(CommissionRate)
    private readonly ratesRepository: Repository<CommissionRate>,
    @InjectRepository(CommissionPayout)
    private readonly payoutsRepository: Repository<CommissionPayout>,
    @InjectRepository(FranchiseSettings)
    private readonly settingsRepository: Repository<FranchiseSettings>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Individual)
    private readonly individualsRepository: Repository<Individual>,
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  // ---------------------------------------------------------------------------
  // Rate resolution (per-variant override → flat channel default)
  // ---------------------------------------------------------------------------

  private flatDefault(
    settings: FranchiseSettings | null,
    channel: CommissionChannel,
  ): number {
    if (channel === CommissionChannel.FRANCHISE)
      return settings?.commissionPerIndividual ?? 0;
    if (channel === CommissionChannel.SCHOOL)
      return settings?.commissionPerStudent ?? 0;
    return settings?.commissionPerEmployee ?? 0;
  }

  /** Effective rate (PKR) for a channel + variant at this moment. */
  async getRate(
    channel: CommissionChannel,
    variant: number | null | undefined,
  ): Promise<number> {
    if (variant != null) {
      const override = await this.ratesRepository.findOne({
        where: { channel, productVariant: variant },
      });
      if (override) return Math.max(0, override.amount);
    }
    const settings = await this.settingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });
    return Math.max(0, this.flatDefault(settings, channel));
  }

  // ---------------------------------------------------------------------------
  // Recording commission at payment confirmation (the snapshot)
  // ---------------------------------------------------------------------------

  /**
   * Freeze the commission on a just-confirmed payment. Idempotent: does nothing
   * if the payment isn't confirmed, is already recorded, or isn't attributed to
   * a partner. Safe to call after every confirm path (single / batch / cash).
   */
  async recordForPayment(payment: Payment): Promise<void> {
    if (payment.status !== PaymentStatus.CONFIRMED) return;
    if (payment.commissionAmount != null) return;

    let channel: CommissionChannel;
    let partnerId: string | null = null;

    if (payment.studentId) {
      channel = CommissionChannel.SCHOOL;
      const student = await this.studentsRepository.findOne({
        where: { id: payment.studentId },
        select: { id: true, institutionId: true },
      });
      partnerId = student?.institutionId ?? null;
    } else if (payment.individualId) {
      channel = CommissionChannel.FRANCHISE;
      const individual = await this.individualsRepository.findOne({
        where: { id: payment.individualId },
        select: { id: true, franchiseId: true },
      });
      partnerId = individual?.franchiseId ?? null;
    } else if (payment.employeeId) {
      channel = CommissionChannel.CORPORATE;
      const employee = await this.employeesRepository.findOne({
        where: { id: payment.employeeId },
        select: { id: true, companyId: true },
      });
      partnerId = employee?.companyId ?? null;
    } else {
      return;
    }

    if (!partnerId) return; // walk-in / unattributed — no commission

    const amount = await this.getRate(channel, payment.productVariant);
    payment.commissionChannel = channel;
    payment.commissionPartnerId = partnerId;
    payment.commissionAmount = amount;
    await this.paymentsRepository.save(payment);
  }

  // ---------------------------------------------------------------------------
  // Summaries (earned / paid / outstanding) per partner
  // ---------------------------------------------------------------------------

  async getSummaries(
    channel: CommissionChannel,
    partnerIds: string[],
  ): Promise<Map<string, PartnerCommissionSummary>> {
    const map = new Map<string, PartnerCommissionSummary>();
    const ids = [...new Set(partnerIds.filter(Boolean))];
    if (ids.length === 0) return map;

    const earnedRows = await this.paymentsRepository
      .createQueryBuilder('p')
      .select('p.commissionPartnerId', 'pid')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(p.commissionAmount), 0)', 'earned')
      .where('p.commissionChannel = :channel', { channel })
      .andWhere('p.commissionPartnerId IN (:...ids)', { ids })
      .andWhere('p.commissionAmount IS NOT NULL')
      .groupBy('p.commissionPartnerId')
      .getRawMany<{ pid: string; count: string; earned: string }>();

    const paidRows = await this.payoutsRepository
      .createQueryBuilder('po')
      .select('po.partnerId', 'pid')
      .addSelect('COALESCE(SUM(po.amount), 0)', 'paid')
      .where('po.channel = :channel', { channel })
      .andWhere('po.partnerId IN (:...ids)', { ids })
      .groupBy('po.partnerId')
      .getRawMany<{ pid: string; paid: string }>();

    const paidByPartner = new Map(
      paidRows.map((r) => [r.pid, Number(r.paid)]),
    );

    for (const id of ids) {
      const e = earnedRows.find((r) => r.pid === id);
      const earned = e ? Number(e.earned) : 0;
      const paid = paidByPartner.get(id) ?? 0;
      map.set(id, {
        earned,
        paid,
        outstanding: earned - paid,
        confirmedCount: e ? Number(e.count) : 0,
      });
    }
    return map;
  }

  async getSummary(
    channel: CommissionChannel,
    partnerId: string,
  ): Promise<PartnerCommissionSummary> {
    const map = await this.getSummaries(channel, [partnerId]);
    return map.get(partnerId) ?? { ...EMPTY_SUMMARY };
  }

  // ---------------------------------------------------------------------------
  // Payouts
  // ---------------------------------------------------------------------------

  async recordPayout(
    channel: CommissionChannel,
    partnerId: string,
    amount: number,
    reference: string | undefined,
    adminId: string,
  ): Promise<CommissionPayout> {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Enter a payout amount greater than zero.');
    }
    if (!COMMISSION_CHANNELS.includes(channel)) {
      throw new BadRequestException('Invalid commission channel.');
    }
    const payout = this.payoutsRepository.create({
      channel,
      partnerId,
      amount: value,
      reference: reference?.trim() || null,
      paidByUserId: adminId,
      paidAt: new Date(),
    });
    return this.payoutsRepository.save(payout);
  }

  listPayouts(
    channel: CommissionChannel,
    partnerId: string,
  ): Promise<CommissionPayout[]> {
    return this.payoutsRepository.find({
      where: { channel, partnerId },
      order: { paidAt: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Per-variant rate overrides (admin)
  // ---------------------------------------------------------------------------

  async getRateConfig(): Promise<{
    flat: {
      franchise: number;
      school: number;
      corporate: number;
    };
    overrides: Array<{ channel: string; productVariant: number; amount: number }>;
  }> {
    const settings = await this.settingsRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });
    const overrides = await this.ratesRepository.find({
      order: { channel: 'ASC', productVariant: 'ASC' },
    });
    return {
      flat: {
        franchise: this.flatDefault(settings, CommissionChannel.FRANCHISE),
        school: this.flatDefault(settings, CommissionChannel.SCHOOL),
        corporate: this.flatDefault(settings, CommissionChannel.CORPORATE),
      },
      overrides: overrides.map((o) => ({
        channel: o.channel,
        productVariant: o.productVariant,
        amount: o.amount,
      })),
    };
  }

  /**
   * Replace the full set of per-variant overrides with the supplied list.
   * Rows with a non-positive/blank amount are treated as "no override" and
   * removed, so clearing a cell falls back to the flat default.
   */
  async setOverrides(
    adminId: string,
    list: Array<{ channel: string; productVariant: number; amount: number | null }>,
  ): Promise<{ count: number }> {
    const valid = (list ?? []).filter(
      (r) =>
        COMMISSION_CHANNELS.includes(r.channel as CommissionChannel) &&
        Number.isInteger(Number(r.productVariant)),
    );
    await this.ratesRepository.manager.transaction(async (manager) => {
      await manager.clear(CommissionRate);
      const rows = valid
        .filter((r) => r.amount != null && Number(r.amount) > 0)
        .map((r) =>
          manager.create(CommissionRate, {
            channel: r.channel,
            productVariant: Number(r.productVariant),
            amount: Math.round(Number(r.amount)),
            updatedByUserId: adminId,
          }),
        );
      if (rows.length) await manager.save(rows);
    });
    const count = await this.ratesRepository.count();
    // Re-apply the new rates to confirmed-but-unpaid registrations.
    await this.recomputeUnpaid();
    return { count };
  }

  // ---------------------------------------------------------------------------
  // One-time backfill (also run by the migration; exposed for safety)
  // ---------------------------------------------------------------------------

  /** Snapshot commission on already-confirmed, attributed payments that have none. */
  async backfill(): Promise<{ recorded: number }> {
    const rows = await this.paymentsRepository
      .createQueryBuilder('p')
      .where('p.status = :s', { s: PaymentStatus.CONFIRMED })
      .andWhere('p.commissionAmount IS NULL')
      .getMany();
    let recorded = 0;
    for (const payment of rows) {
      await this.recordForPayment(payment);
      if (payment.commissionAmount != null) recorded += 1;
    }
    return { recorded };
  }

  /**
   * Re-apply the current rate to confirmed, attributed registrations whose
   * partner has NOT been paid out yet. This is what lets earnings update when a
   * rate is set or changed after some payments were already confirmed (e.g. the
   * rate was still 0 at confirmation). Partners who have received any payout are
   * left untouched, so settled history is never rewritten. Also records
   * commission on any confirmed-but-unrecorded rows.
   */
  async recomputeUnpaid(): Promise<{ updated: number }> {
    // Partners that already received a payout — their numbers stay frozen.
    const paidRows = await this.payoutsRepository
      .createQueryBuilder('po')
      .select('po.partnerId', 'pid')
      .distinct(true)
      .getRawMany<{ pid: string }>();
    const settled = new Set(paidRows.map((r) => r.pid));

    const rows = await this.paymentsRepository
      .createQueryBuilder('p')
      .where('p.status = :s', { s: PaymentStatus.CONFIRMED })
      .getMany();

    let updated = 0;
    for (const payment of rows) {
      // Not yet attributed (e.g. never recorded) — try to record it now.
      if (payment.commissionAmount == null) {
        await this.recordForPayment(payment);
        if (payment.commissionAmount != null) updated += 1;
        continue;
      }
      if (!payment.commissionChannel || !payment.commissionPartnerId) continue;
      if (settled.has(payment.commissionPartnerId)) continue;
      const amount = await this.getRate(
        payment.commissionChannel as CommissionChannel,
        payment.productVariant,
      );
      if (amount !== payment.commissionAmount) {
        payment.commissionAmount = amount;
        await this.paymentsRepository.save(payment);
        updated += 1;
      }
    }
    return { updated };
  }
}
