import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Institution } from './entities/institution.entity';
import { Student } from '../students/entities/student.entity';
import {
  buildReferralCode,
  referralCodePrefix,
} from '../area/franchise-code.util';
import { CommissionService } from '../commission/commission.service';
import { CommissionChannel } from '../commission/enums/commission-channel.enum';
import { InstitutionApprovalStatus } from './enums/institution-approval-status.enum';
import { InstitutionType } from './enums/institution-type.enum';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { parseDateRange } from '../../common/utils/date-range.util';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { Multer } from 'multer';

export interface InstitutionAdminFilters {
  status?: InstitutionApprovalStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

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
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly commissionService: CommissionService,
  ) {}

  // ---------------------------------------------------------------------------
  // Referral programme: a reference code per school + per-head earnings.
  // Attribution rides the existing student.institutionId link, so the code is
  // only an identifier for admin management and payouts.
  // ---------------------------------------------------------------------------

  /** Generate + persist a unique SSC-SCH reference code if the school lacks one. */
  async ensureReferralCode(institution: Institution): Promise<string> {
    if (institution.referralCode) return institution.referralCode;
    const prefix = referralCodePrefix(
      'SCH',
      institution.province,
      institution.district,
    );
    const existing = await this.institutionsRepository
      .createQueryBuilder('i')
      .where('i.referralCode LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    let serial = existing + 1;
    // Probe for uniqueness to survive backfilled gaps / races.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const code = buildReferralCode(
        'SCH',
        institution.province,
        institution.district,
        serial,
      );
      const clash = await this.institutionsRepository.findOne({
        where: { referralCode: code },
      });
      if (!clash) {
        institution.referralCode = code;
        await this.institutionsRepository.save(institution);
        return code;
      }
      serial += 1;
    }
  }

  /** Total enrolled student count per institution id. */
  private async getStudentCounts(
    institutionIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (institutionIds.length === 0) return map;
    const rows = await this.studentsRepository
      .createQueryBuilder('s')
      .select('s.institutionId', 'iid')
      .addSelect('COUNT(*)', 'total')
      .where('s.institutionId IN (:...ids)', { ids: institutionIds })
      .groupBy('s.institutionId')
      .getRawMany<{ iid: string; total: string }>();
    for (const r of rows) map.set(r.iid, Number(r.total));
    return map;
  }

  /** Self-service: one school's code, counts and earned/paid/outstanding. */
  async getMyReferral(ownerUserId: string) {
    const institution = await this.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }
    const code = await this.ensureReferralCode(institution);
    const [counts, summary, payouts, payoutRequests] = await Promise.all([
      this.getStudentCounts([institution.id]),
      this.commissionService.getSummary(CommissionChannel.SCHOOL, institution.id),
      this.commissionService.listPayouts(CommissionChannel.SCHOOL, institution.id),
      this.commissionService.listPayoutRequests(
        CommissionChannel.SCHOOL,
        institution.id,
      ),
    ]);
    return {
      code,
      totalStudents: counts.get(institution.id) ?? 0,
      confirmedStudents: summary.confirmedCount,
      earned: summary.earned,
      paid: summary.paid,
      outstanding: summary.outstanding,
      payouts,
      payoutRequests,
    };
  }

  /** School self-service: request a payout of outstanding commission. */
  async requestPayout(
    ownerUserId: string,
    amount: number,
    details: { bankName: string; accountNumber: string; accountHolderName: string },
  ) {
    const institution = await this.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }
    return this.commissionService.requestPayout(
      CommissionChannel.SCHOOL,
      institution.id,
      amount,
      details,
    );
  }

  /** School self-service: confirm receipt of an approved payout. */
  async confirmPayout(ownerUserId: string, requestId: string) {
    const institution = await this.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }
    return this.commissionService.confirmPayoutRequest(requestId, institution.id);
  }

  /** Admin: every school with its code, counts and earned/paid/outstanding. */
  async listReferralStatsForAdmin() {
    const institutions = await this.institutionsRepository.find({
      order: { createdAt: 'DESC' },
    });
    for (const inst of institutions) {
      if (!inst.referralCode) await this.ensureReferralCode(inst);
    }
    const ids = institutions.map((i) => i.id);
    const [counts, summaries] = await Promise.all([
      this.getStudentCounts(ids),
      this.commissionService.getSummaries(CommissionChannel.SCHOOL, ids),
    ]);
    return institutions.map((inst) => {
      const s = summaries.get(inst.id);
      return {
        id: inst.id,
        name: inst.name,
        city: inst.city,
        referralCode: inst.referralCode,
        totalStudents: counts.get(inst.id) ?? 0,
        confirmedStudents: s?.confirmedCount ?? 0,
        earned: s?.earned ?? 0,
        paid: s?.paid ?? 0,
        outstanding: s?.outstanding ?? 0,
      };
    });
  }

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
    const saved = await this.institutionsRepository.save(institution);
    // Assign a reference code on approval so it exists before the school asks.
    await this.ensureReferralCode(saved).catch(() => undefined);
    return saved;
  }

  async reject(id: string, reason?: string): Promise<Institution> {
    const institution = await this.findById(id);
    institution.approvalStatus = InstitutionApprovalStatus.REJECTED;
    institution.rejectionReason = reason ?? null;
    return this.institutionsRepository.save(institution);
  }

  async findAllAdmin(
    filters: InstitutionAdminFilters = {},
  ): Promise<Array<Institution & { enrolledStudents: number }>> {
    const qb = this.institutionsRepository
      .createQueryBuilder('institution')
      .leftJoinAndSelect('institution.ownerUser', 'ownerUser');

    if (filters.status) {
      qb.andWhere('institution.approvalStatus = :status', {
        status: filters.status,
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(institution.name ILIKE :search OR institution.registrationNumber ILIKE :search OR institution.city ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const { from, to } = parseDateRange(filters.startDate, filters.endDate);
    if (from) {
      qb.andWhere('institution.createdAt >= :fromDate', { fromDate: from });
    }
    if (to) {
      qb.andWhere('institution.createdAt <= :toDate', { toDate: to });
    }

    qb.orderBy('institution.createdAt', 'DESC');
    const institutions = await qb.getMany();

    if (institutions.length === 0) {
      return [];
    }

    const counts = await this.studentsRepository
      .createQueryBuilder('student')
      .select('student.institutionId', 'institutionId')
      .addSelect('COUNT(*)', 'count')
      .where('student.institutionId IN (:...ids)', {
        ids: institutions.map((inst) => inst.id),
      })
      .groupBy('student.institutionId')
      .getRawMany<{ institutionId: string; count: string }>();

    const countByInstitution = new Map(
      counts.map((row) => [row.institutionId, Number(row.count)]),
    );

    return institutions.map((institution) => ({
      ...institution,
      enrolledStudents: countByInstitution.get(institution.id) ?? 0,
    }));
  }

  async update(
    id: string,
    dto: UpdateInstitutionDto,
  ): Promise<Institution> {
    const institution = await this.findById(id);
    Object.assign(institution, dto);
    return this.institutionsRepository.save(institution);
  }

  async updateOwn(
    ownerUserId: string,
    dto: UpdateInstitutionDto,
  ): Promise<Institution> {
    const institution = await this.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }
    Object.assign(institution, dto);
    return this.institutionsRepository.save(institution);
  }

  async uploadOwnLogo(
    ownerUserId: string,
    file: Multer.File,
  ): Promise<{ logoUrl: string }> {
    const institution = await this.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }

    const uploaded = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      'student-smart-card/institution-logos',
      file.originalname,
    );

    const previousPublicId = institution.logoPublicId;
    institution.logoUrl = uploaded.url;
    institution.logoPublicId = uploaded.publicId;
    await this.institutionsRepository.save(institution);

    if (previousPublicId) {
      await this.cloudinaryService.destroy(previousPublicId);
    }

    return { logoUrl: uploaded.url };
  }

  async removeOwnLogo(ownerUserId: string): Promise<{ message: string }> {
    const institution = await this.findByOwnerUserId(ownerUserId);
    if (!institution) {
      throw new NotFoundException('No institution found for this account');
    }

    const previousPublicId = institution.logoPublicId;
    institution.logoUrl = null;
    institution.logoPublicId = null;
    await this.institutionsRepository.save(institution);

    if (previousPublicId) {
      await this.cloudinaryService.destroy(previousPublicId);
    }

    return { message: 'Logo removed' };
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findById(id);
    await this.institutionsRepository.delete(id);
    return { message: 'Institution deleted' };
  }
}
