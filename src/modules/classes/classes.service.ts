import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolClass } from './entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { InstitutionsService } from '../institutions/institutions.service';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(SchoolClass)
    private readonly classesRepository: Repository<SchoolClass>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly institutionsService: InstitutionsService,
  ) {}

  private async resolveInstitutionId(
    currentUser: JwtPayload,
    requestedInstitutionId?: string,
  ): Promise<string> {
    if (currentUser.role === UserRole.SCHOOL) {
      const institution = await this.institutionsService.findByOwnerUserId(
        currentUser.sub,
      );
      if (!institution) {
        throw new ForbiddenException('No institution found for this account');
      }
      return institution.id;
    }

    // ADMIN
    if (!requestedInstitutionId) {
      throw new BadRequestException('institutionId is required');
    }
    await this.institutionsService.findById(requestedInstitutionId);
    return requestedInstitutionId;
  }

  async create(
    currentUser: JwtPayload,
    dto: CreateClassDto,
  ): Promise<SchoolClass> {
    const institutionId = await this.resolveInstitutionId(
      currentUser,
      dto.institutionId,
    );

    const schoolClass = this.classesRepository.create({
      institutionId,
      name: dto.name,
      academicYear: dto.academicYear ?? null,
    });
    return this.classesRepository.save(schoolClass);
  }

  async findAllForInstitution(
    currentUser: JwtPayload,
    requestedInstitutionId?: string,
  ): Promise<Array<SchoolClass & { studentCount: number }>> {
    const institutionId = await this.resolveInstitutionId(
      currentUser,
      requestedInstitutionId,
    );

    const classes = await this.classesRepository.find({
      where: { institutionId },
      order: { name: 'ASC' },
    });

    if (classes.length === 0) {
      return [];
    }

    const counts = await this.studentsRepository
      .createQueryBuilder('student')
      .select('student.classId', 'classId')
      .addSelect('COUNT(*)', 'count')
      .where('student.classId IN (:...ids)', {
        ids: classes.map((c) => c.id),
      })
      .groupBy('student.classId')
      .getRawMany<{ classId: string; count: string }>();

    const countByClass = new Map(
      counts.map((row) => [row.classId, Number(row.count)]),
    );

    return classes.map((schoolClass) => ({
      ...schoolClass,
      studentCount: countByClass.get(schoolClass.id) ?? 0,
    }));
  }

  private async findByIdOrThrow(id: string): Promise<SchoolClass> {
    const schoolClass = await this.classesRepository.findOne({
      where: { id },
    });
    if (!schoolClass) {
      throw new NotFoundException('Class not found');
    }
    return schoolClass;
  }

  private async assertOwnership(
    currentUser: JwtPayload,
    schoolClass: SchoolClass,
  ): Promise<void> {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }
    const institution = await this.institutionsService.findByOwnerUserId(
      currentUser.sub,
    );
    if (!institution || schoolClass.institutionId !== institution.id) {
      throw new ForbiddenException('You do not have access to this class');
    }
  }

  async update(
    currentUser: JwtPayload,
    id: string,
    dto: UpdateClassDto,
  ): Promise<SchoolClass> {
    const schoolClass = await this.findByIdOrThrow(id);
    await this.assertOwnership(currentUser, schoolClass);

    const nameChanged = dto.name !== undefined && dto.name !== schoolClass.name;

    Object.assign(schoolClass, dto);
    const saved = await this.classesRepository.save(schoolClass);

    if (nameChanged) {
      // Keep each student's denormalized className display in sync with
      // the class they're actually assigned to.
      await this.studentsRepository.update(
        { classId: saved.id },
        { className: saved.name },
      );
    }

    return saved;
  }

  async remove(currentUser: JwtPayload, id: string): Promise<{ message: string }> {
    const schoolClass = await this.findByIdOrThrow(id);
    await this.assertOwnership(currentUser, schoolClass);
    await this.classesRepository.delete(id);
    return { message: 'Class deleted' };
  }

  async findByIdForOwnership(
    id: string,
    institutionId: string,
  ): Promise<SchoolClass> {
    const schoolClass = await this.findByIdOrThrow(id);
    if (schoolClass.institutionId !== institutionId) {
      throw new BadRequestException(
        'This class does not belong to your institution',
      );
    }
    return schoolClass;
  }
}
