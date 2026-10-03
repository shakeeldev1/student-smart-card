import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Multer } from 'multer';
import { registrationFeeForVariant } from '../../common/payments/registration-fee.util';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { Payment } from './entities/payment.entity';
import { PaymentSettings } from './entities/payment-settings.entity';
import { PaymentMethod } from './enums/payment-method.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';

export interface PaymentListFilters {
  status?: PaymentStatus;
  page?: string;
  limit?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(PaymentSettings)
    private readonly settingsRepository: Repository<PaymentSettings>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Individual)
    private readonly individualsRepository: Repository<Individual>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ---- Settings (admin-managed bank details + QR) ----

  async getSettings(): Promise<PaymentSettings> {
    const existing = await this.settingsRepository.find({ take: 1 });
    if (existing[0]) {
      return existing[0];
    }
    return this.settingsRepository.save(this.settingsRepository.create({}));
  }

  async updateSettings(dto: UpdatePaymentSettingsDto, adminId: string): Promise<PaymentSettings> {
    const settings = await this.getSettings();
    Object.assign(settings, dto, { updatedByUserId: adminId });
    return this.settingsRepository.save(settings);
  }

  async updateQr(fileBuffer: Buffer, originalName: string, adminId: string): Promise<PaymentSettings> {
    const settings = await this.getSettings();
    const uploaded = await this.cloudinary.uploadBuffer(fileBuffer, 'payment-qr', originalName);
    if (settings.qrImagePublicId) {
      await this.cloudinary.destroy(settings.qrImagePublicId);
    }
    settings.qrImageUrl = uploaded.url;
    settings.qrImagePublicId = uploaded.publicId;
    settings.updatedByUserId = adminId;
    return this.settingsRepository.save(settings);
  }

  // ---- Payer-facing (view current payment) ----

  getForStudent(studentId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({ where: { studentId } });
  }

  getForIndividual(individualId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({ where: { individualId } });
  }

  async getMineForIndividual(userId: string): Promise<Payment | null> {
    const individual = await this.individualsRepository.findOne({ where: { userId } });
    return individual ? this.getForIndividual(individual.id) : null;
  }

  // ---- Submit proof (school for a student / individual for themselves) ----

  async submitForStudent(
    actor: JwtPayload,
    studentId: string,
    dto: SubmitPaymentDto,
    file: Multer.File,
  ): Promise<Payment> {
    const student = await this.studentsRepository.findOne({
      where: { id: studentId },
      relations: { institution: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (actor.role !== UserRole.ADMIN && student.institution?.ownerUserId !== actor.sub) {
      throw new ForbiddenException('This student does not belong to your school');
    }
    const amount = this.requireFee(student.productVariant);
    return this.upsert({ studentId }, student.productVariant as number, amount, dto, file);
  }

  async submitForIndividual(
    userId: string,
    dto: SubmitPaymentDto,
    file: Multer.File,
  ): Promise<Payment> {
    const individual = await this.individualsRepository.findOne({ where: { userId } });
    if (!individual) {
      throw new NotFoundException('No application found for this account');
    }
    const amount = this.requireFee(individual.productVariant);
    return this.upsert(
      { individualId: individual.id },
      individual.productVariant as number,
      amount,
      dto,
      file,
    );
  }

  private requireFee(variant: number | null): number {
    const amount = registrationFeeForVariant(variant);
    if (amount === null) {
      throw new BadRequestException(
        'Select a Takaful plan (product variant) on the application before paying.',
      );
    }
    return amount;
  }

  private async upsert(
    key: { studentId?: string; individualId?: string },
    productVariant: number,
    amount: number,
    dto: SubmitPaymentDto,
    file: Multer.File,
  ): Promise<Payment> {
    const existing = await this.paymentsRepository.findOne({ where: key });
    if (existing?.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('This registration has already been paid and confirmed.');
    }

    const uploaded = await this.cloudinary.uploadBuffer(
      file.buffer,
      'payment-proofs',
      file.originalname,
    );

    if (existing) {
      // Replace the previous (rejected/pending) proof and reset to pending.
      if (existing.proofImagePublicId) {
        await this.cloudinary.destroy(existing.proofImagePublicId);
      }
      existing.amount = amount;
      existing.productVariant = productVariant;
      existing.method = PaymentMethod.MANUAL_BANK_TRANSFER;
      existing.status = PaymentStatus.PENDING;
      existing.proofImageUrl = uploaded.url;
      existing.proofImagePublicId = uploaded.publicId;
      existing.reference = dto.reference ?? null;
      existing.reviewedByUserId = null;
      existing.reviewedAt = null;
      existing.rejectionReason = null;
      return this.paymentsRepository.save(existing);
    }

    return this.paymentsRepository.save(
      this.paymentsRepository.create({
        ...key,
        amount,
        productVariant,
        method: PaymentMethod.MANUAL_BANK_TRANSFER,
        status: PaymentStatus.PENDING,
        proofImageUrl: uploaded.url,
        proofImagePublicId: uploaded.publicId,
        reference: dto.reference ?? null,
      }),
    );
  }

  // ---- Admin verification ----

  async listForAdmin(filters: PaymentListFilters = {}): Promise<{
    items: Payment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const where = filters.status ? { status: filters.status } : {};
    const [items, total] = await this.paymentsRepository.findAndCount({
      where,
      relations: { student: true, individual: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  private async findByIdOrThrow(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { student: true, individual: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async confirm(id: string, adminId: string): Promise<Payment> {
    const payment = await this.findByIdOrThrow(id);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only a pending payment can be confirmed.');
    }
    payment.status = PaymentStatus.CONFIRMED;
    payment.reviewedByUserId = adminId;
    payment.reviewedAt = new Date();
    payment.rejectionReason = null;
    return this.paymentsRepository.save(payment);
  }

  async reject(id: string, adminId: string, reason?: string): Promise<Payment> {
    const payment = await this.findByIdOrThrow(id);
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only a pending payment can be rejected.');
    }
    payment.status = PaymentStatus.REJECTED;
    payment.reviewedByUserId = adminId;
    payment.reviewedAt = new Date();
    payment.rejectionReason = reason ?? null;
    return this.paymentsRepository.save(payment);
  }

  // ---- Gating helpers (used by EFU approval) ----

  async isConfirmedForStudent(studentId: string): Promise<boolean> {
    const payment = await this.getForStudent(studentId);
    return payment?.status === PaymentStatus.CONFIRMED;
  }

  async isConfirmedForIndividual(individualId: string): Promise<boolean> {
    const payment = await this.getForIndividual(individualId);
    return payment?.status === PaymentStatus.CONFIRMED;
  }
}
