import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import type { Multer } from 'multer';
import { registrationFeeForVariant } from '../../common/payments/registration-fee.util';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Student } from '../students/entities/student.entity';
import { Individual } from '../individuals/entities/individual.entity';
import { Employee } from '../corporate/entities/employee.entity';
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
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
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

  getForEmployee(employeeId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({ where: { employeeId } });
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

  async submitForEmployee(
    actor: JwtPayload,
    employeeId: string,
    dto: SubmitPaymentDto,
    file: Multer.File,
  ): Promise<Payment> {
    const employee = await this.employeesRepository.findOne({
      where: { id: employeeId },
      relations: { company: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (actor.role !== UserRole.ADMIN && employee.company?.ownerUserId !== actor.sub) {
      throw new ForbiddenException('This employee does not belong to your company');
    }
    const amount = this.requireFee(employee.productVariant);
    return this.upsert({ employeeId }, employee.productVariant as number, amount, dto, file);
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
    key: { studentId?: string; individualId?: string; employeeId?: string },
    productVariant: number,
    amount: number,
    dto: SubmitPaymentDto,
    file: Multer.File,
  ): Promise<Payment> {
    const uploaded = await this.cloudinary.uploadBuffer(
      file.buffer,
      'payment-proofs',
      file.originalname,
    );
    return this.upsertWithProof(key, productVariant, amount, {
      proofImageUrl: uploaded.url,
      proofImagePublicId: uploaded.publicId,
      reference: dto.reference ?? null,
      batchId: null,
    });
  }

  /**
   * Creates or resets a payment row to PENDING with the given (already uploaded)
   * proof. Shared by single and batch submissions. A CONFIRMED payment is never
   * overwritten.
   */
  private async upsertWithProof(
    key: { studentId?: string; individualId?: string; employeeId?: string },
    productVariant: number,
    amount: number,
    proof: {
      proofImageUrl: string;
      proofImagePublicId: string | null;
      reference: string | null;
      batchId: string | null;
    },
  ): Promise<Payment> {
    const existing = await this.paymentsRepository.findOne({ where: key });
    if (existing?.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('This registration has already been paid and confirmed.');
    }

    if (existing) {
      // Replace the previous (rejected/pending) proof and reset to pending.
      // Don't destroy a proof that's shared with other rows of the same batch.
      if (
        existing.proofImagePublicId &&
        existing.proofImagePublicId !== proof.proofImagePublicId
      ) {
        await this.cloudinary.destroy(existing.proofImagePublicId);
      }
      existing.amount = amount;
      existing.productVariant = productVariant;
      existing.method = PaymentMethod.MANUAL_BANK_TRANSFER;
      existing.status = PaymentStatus.PENDING;
      existing.proofImageUrl = proof.proofImageUrl;
      existing.proofImagePublicId = proof.proofImagePublicId;
      existing.reference = proof.reference;
      existing.batchId = proof.batchId;
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
        proofImageUrl: proof.proofImageUrl,
        proofImagePublicId: proof.proofImagePublicId,
        reference: proof.reference,
        batchId: proof.batchId,
      }),
    );
  }

  // ---- School: outstanding fees + combined (batch) payment ----

  /**
   * Lists the school's students with their payment status and fee, plus the
   * outstanding total (students with no payment or a rejected one).
   */
  async getSchoolOutstanding(actor: JwtPayload): Promise<{
    items: Array<{
      id: string;
      fullName: string;
      className: string;
      sectionName: string | null;
      productVariant: number | null;
      fee: number | null;
      paymentStatus: 'none' | 'pending' | 'confirmed' | 'rejected';
      needsPayment: boolean;
    }>;
    totalOutstanding: number;
    outstandingCount: number;
  }> {
    const students = await this.studentsRepository.find({
      where: { institution: { ownerUserId: actor.sub } },
      relations: { institution: true, section: true },
      order: { createdAt: 'DESC' },
    });
    const ids = students.map((s) => s.id);
    const payments = ids.length
      ? await this.paymentsRepository.find({ where: { studentId: In(ids) } })
      : [];
    const byStudent = new Map(payments.map((p) => [p.studentId as string, p]));

    let totalOutstanding = 0;
    let outstandingCount = 0;
    const items = students.map((s) => {
      const payment = byStudent.get(s.id);
      const paymentStatus = payment ? payment.status : 'none';
      const needsPayment =
        paymentStatus === 'none' || paymentStatus === PaymentStatus.REJECTED;
      const fee = registrationFeeForVariant(s.productVariant);
      if (needsPayment && fee) {
        totalOutstanding += fee;
        outstandingCount += 1;
      }
      return {
        id: s.id,
        fullName: s.fullName,
        className: s.className,
        sectionName: s.section?.name ?? null,
        productVariant: s.productVariant,
        fee,
        paymentStatus: paymentStatus as 'none' | 'pending' | 'confirmed' | 'rejected',
        needsPayment,
      };
    });

    return { items, totalOutstanding, outstandingCount };
  }

  /**
   * One combined transfer for several students: a single proof is shared across
   * one payment row per student (same batchId), confirmed/rejected together.
   */
  async submitBatchForStudents(
    actor: JwtPayload,
    studentIds: string[],
    reference: string | undefined,
    file: Multer.File,
  ): Promise<{ batchId: string; count: number; totalAmount: number }> {
    const unique = [...new Set(studentIds)].filter(Boolean);
    if (unique.length === 0) {
      throw new BadRequestException('Select at least one student to pay for.');
    }

    const students = await this.studentsRepository.find({
      where: { id: In(unique) },
      relations: { institution: true },
    });
    if (students.length !== unique.length) {
      throw new NotFoundException('One or more selected students were not found.');
    }

    for (const student of students) {
      if (actor.role !== UserRole.ADMIN && student.institution?.ownerUserId !== actor.sub) {
        throw new ForbiddenException('One or more students do not belong to your school.');
      }
    }

    // Snapshot each fee; block the batch if any selected student has no variant.
    const fees = students.map((s) => ({ student: s, amount: this.requireFee(s.productVariant) }));

    // Skip any student already confirmed (nothing to pay).
    const existing = await this.paymentsRepository.find({
      where: { studentId: In(unique) },
    });
    const confirmed = new Set(
      existing.filter((p) => p.status === PaymentStatus.CONFIRMED).map((p) => p.studentId),
    );
    const payable = fees.filter((f) => !confirmed.has(f.student.id));
    if (payable.length === 0) {
      throw new BadRequestException('All selected students are already paid and confirmed.');
    }

    const uploaded = await this.cloudinary.uploadBuffer(
      file.buffer,
      'payment-proofs',
      file.originalname,
    );
    const batchId = randomUUID();

    let totalAmount = 0;
    for (const { student, amount } of payable) {
      await this.upsertWithProof({ studentId: student.id }, student.productVariant as number, amount, {
        proofImageUrl: uploaded.url,
        proofImagePublicId: uploaded.publicId,
        reference: reference ?? null,
        batchId,
      });
      totalAmount += amount;
    }

    return { batchId, count: payable.length, totalAmount };
  }

  async confirmBatch(batchId: string, adminId: string): Promise<{ count: number }> {
    const rows = await this.paymentsRepository.find({ where: { batchId } });
    if (rows.length === 0) {
      throw new NotFoundException('Payment batch not found');
    }
    let count = 0;
    for (const payment of rows) {
      if (payment.status !== PaymentStatus.PENDING) continue;
      payment.status = PaymentStatus.CONFIRMED;
      payment.reviewedByUserId = adminId;
      payment.reviewedAt = new Date();
      payment.rejectionReason = null;
      await this.paymentsRepository.save(payment);
      count += 1;
    }
    return { count };
  }

  async rejectBatch(batchId: string, adminId: string, reason?: string): Promise<{ count: number }> {
    const rows = await this.paymentsRepository.find({ where: { batchId } });
    if (rows.length === 0) {
      throw new NotFoundException('Payment batch not found');
    }
    let count = 0;
    for (const payment of rows) {
      if (payment.status !== PaymentStatus.PENDING) continue;
      payment.status = PaymentStatus.REJECTED;
      payment.reviewedByUserId = adminId;
      payment.reviewedAt = new Date();
      payment.rejectionReason = reason ?? null;
      await this.paymentsRepository.save(payment);
      count += 1;
    }
    return { count };
  }

  // ---- Company: outstanding fees + combined (batch) payment ----

  async getCompanyOutstanding(actor: JwtPayload): Promise<{
    items: Array<{
      id: string;
      fullName: string;
      department: string | null;
      designation: string | null;
      productVariant: number | null;
      fee: number | null;
      paymentStatus: 'none' | 'pending' | 'confirmed' | 'rejected';
      needsPayment: boolean;
    }>;
    totalOutstanding: number;
    outstandingCount: number;
  }> {
    const employees = await this.employeesRepository.find({
      where: { company: { ownerUserId: actor.sub } },
      relations: { company: true },
      order: { createdAt: 'DESC' },
    });
    const ids = employees.map((e) => e.id);
    const payments = ids.length
      ? await this.paymentsRepository.find({ where: { employeeId: In(ids) } })
      : [];
    const byEmployee = new Map(payments.map((p) => [p.employeeId as string, p]));

    let totalOutstanding = 0;
    let outstandingCount = 0;
    const items = employees.map((e) => {
      const payment = byEmployee.get(e.id);
      const paymentStatus = payment ? payment.status : 'none';
      const needsPayment =
        paymentStatus === 'none' || paymentStatus === PaymentStatus.REJECTED;
      const fee = registrationFeeForVariant(e.productVariant);
      if (needsPayment && fee) {
        totalOutstanding += fee;
        outstandingCount += 1;
      }
      return {
        id: e.id,
        fullName: e.fullName,
        department: e.department,
        designation: e.designation,
        productVariant: e.productVariant,
        fee,
        paymentStatus: paymentStatus as 'none' | 'pending' | 'confirmed' | 'rejected',
        needsPayment,
      };
    });

    return { items, totalOutstanding, outstandingCount };
  }

  async submitBatchForEmployees(
    actor: JwtPayload,
    employeeIds: string[],
    reference: string | undefined,
    file: Multer.File,
  ): Promise<{ batchId: string; count: number; totalAmount: number }> {
    const unique = [...new Set(employeeIds)].filter(Boolean);
    if (unique.length === 0) {
      throw new BadRequestException('Select at least one employee to pay for.');
    }

    const employees = await this.employeesRepository.find({
      where: { id: In(unique) },
      relations: { company: true },
    });
    if (employees.length !== unique.length) {
      throw new NotFoundException('One or more selected employees were not found.');
    }
    for (const employee of employees) {
      if (actor.role !== UserRole.ADMIN && employee.company?.ownerUserId !== actor.sub) {
        throw new ForbiddenException('One or more employees do not belong to your company.');
      }
    }

    const fees = employees.map((e) => ({ employee: e, amount: this.requireFee(e.productVariant) }));
    const existing = await this.paymentsRepository.find({ where: { employeeId: In(unique) } });
    const confirmed = new Set(
      existing.filter((p) => p.status === PaymentStatus.CONFIRMED).map((p) => p.employeeId),
    );
    const payable = fees.filter((f) => !confirmed.has(f.employee.id));
    if (payable.length === 0) {
      throw new BadRequestException('All selected employees are already paid and confirmed.');
    }

    const uploaded = await this.cloudinary.uploadBuffer(
      file.buffer,
      'payment-proofs',
      file.originalname,
    );
    const batchId = randomUUID();

    let totalAmount = 0;
    for (const { employee, amount } of payable) {
      await this.upsertWithProof(
        { employeeId: employee.id },
        employee.productVariant as number,
        amount,
        {
          proofImageUrl: uploaded.url,
          proofImagePublicId: uploaded.publicId,
          reference: reference ?? null,
          batchId,
        },
      );
      totalAmount += amount;
    }

    return { batchId, count: payable.length, totalAmount };
  }

  // ---- Public (no-login) payment/tracking link for a school student or employee ----

  async getPublicApplication(token: string): Promise<{
    kind: 'student' | 'employee';
    applicant: {
      id: string;
      fullName: string;
      group: string | null; // class/section for students, department for employees
      orgName: string | null; // school or company name
      productVariant: number | null;
      status: string;
      certificateIssued: boolean;
      card: { cardNumber: string; status: string } | null;
    };
    payment: Payment | null;
    settings: PaymentSettings;
    fee: number | null;
  }> {
    const settings = await this.getSettings();

    const student = await this.studentsRepository.findOne({
      where: { publicToken: token },
      relations: { institution: true, section: true, card: true },
    });
    if (student) {
      const payment = await this.getForStudent(student.id);
      const group = [student.className, student.section?.name].filter(Boolean).join(' · ') || null;
      return {
        kind: 'student',
        applicant: {
          id: student.id,
          fullName: student.fullName,
          group,
          orgName: student.institution?.name ?? student.institutionNameFreeText ?? null,
          productVariant: student.productVariant,
          status: student.status,
          certificateIssued: student.certificateIssued,
          card: student.card
            ? { cardNumber: student.card.cardNumber, status: student.card.status }
            : null,
        },
        payment,
        settings,
        fee: registrationFeeForVariant(student.productVariant),
      };
    }

    const employee = await this.employeesRepository.findOne({
      where: { publicToken: token },
      relations: { company: true, card: true },
    });
    if (employee) {
      const payment = await this.getForEmployee(employee.id);
      const group = [employee.designation, employee.department].filter(Boolean).join(' · ') || null;
      return {
        kind: 'employee',
        applicant: {
          id: employee.id,
          fullName: employee.fullName,
          group,
          orgName: employee.company?.name ?? null,
          productVariant: employee.productVariant,
          status: employee.status,
          certificateIssued: employee.certificateIssued,
          card: employee.card
            ? { cardNumber: employee.card.cardNumber, status: employee.card.status }
            : null,
        },
        payment,
        settings,
        fee: registrationFeeForVariant(employee.productVariant),
      };
    }

    throw new NotFoundException('This link is invalid or has expired.');
  }

  async submitByPublicToken(
    token: string,
    dto: SubmitPaymentDto,
    file: Multer.File,
  ): Promise<Payment> {
    const student = await this.studentsRepository.findOne({ where: { publicToken: token } });
    if (student) {
      const amount = this.requireFee(student.productVariant);
      return this.upsert({ studentId: student.id }, student.productVariant as number, amount, dto, file);
    }
    const employee = await this.employeesRepository.findOne({ where: { publicToken: token } });
    if (employee) {
      const amount = this.requireFee(employee.productVariant);
      return this.upsert({ employeeId: employee.id }, employee.productVariant as number, amount, dto, file);
    }
    throw new NotFoundException('This link is invalid or has expired.');
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
      relations: { student: true, individual: true, employee: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  private async findByIdOrThrow(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: { student: true, individual: true, employee: true },
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

  async isConfirmedForEmployee(employeeId: string): Promise<boolean> {
    const payment = await this.getForEmployee(employeeId);
    return payment?.status === PaymentStatus.CONFIRMED;
  }
}
