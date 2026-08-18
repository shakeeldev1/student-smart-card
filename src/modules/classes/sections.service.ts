import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from './entities/section.entity';
import { SchoolClass } from './entities/school-class.entity';
import { Student } from '../students/entities/student.entity';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { InstitutionsService } from '../institutions/institutions.service';
import { UserRole } from '../users/enums/user-role.enum';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
    @InjectRepository(SchoolClass)
    private readonly classesRepository: Repository<SchoolClass>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    private readonly institutionsService: InstitutionsService,
  ) {}

  private async findByIdOrThrow(id: string): Promise<Section> {
    const section = await this.sectionsRepository.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  private async assertOwnership(
    currentUser: JwtPayload,
    section: Section,
  ): Promise<void> {
    const institution = await this.institutionsService.findByOwnerUserId(
      currentUser.sub,
    );
    const schoolClass = await this.classesRepository.findOne({
      where: { id: section.classId },
    });
    if (
      !institution ||
      !schoolClass ||
      schoolClass.institutionId !== institution.id
    ) {
      throw new ForbiddenException('You do not have access to this section');
    }
  }

  async create(currentUser: JwtPayload, dto: CreateSectionDto): Promise<Section> {
    const institution = await this.institutionsService.findByOwnerUserId(
      currentUser.sub,
    );
    if (!institution) {
      throw new ForbiddenException('No institution found for this account');
    }

    const schoolClass = await this.classesRepository.findOne({
      where: { id: dto.classId, institutionId: institution.id },
    });
    if (!schoolClass) {
      throw new NotFoundException('Class not found');
    }

    const existing = await this.sectionsRepository.findOne({
      where: { classId: dto.classId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        'A section with this name already exists in this class',
      );
    }

    const section = this.sectionsRepository.create({
      classId: dto.classId,
      name: dto.name,
    });
    return this.sectionsRepository.save(section);
  }

  async findAllForClass(
    currentUser: JwtPayload,
    classId?: string,
  ): Promise<Array<Section & { studentCount: number }>> {
    if (!classId) {
      throw new BadRequestException('classId is required');
    }

    const schoolClass = await this.classesRepository.findOne({
      where: { id: classId },
    });
    if (!schoolClass) {
      throw new NotFoundException('Class not found');
    }

    if (currentUser.role === UserRole.SCHOOL) {
      const institution = await this.institutionsService.findByOwnerUserId(
        currentUser.sub,
      );
      if (!institution || schoolClass.institutionId !== institution.id) {
        throw new ForbiddenException('You do not have access to this class');
      }
    }

    const sections = await this.sectionsRepository.find({
      where: { classId },
      order: { name: 'ASC' },
    });

    if (sections.length === 0) {
      return [];
    }

    const counts = await this.studentsRepository
      .createQueryBuilder('student')
      .select('student.sectionId', 'sectionId')
      .addSelect('COUNT(*)', 'count')
      .where('student.sectionId IN (:...ids)', {
        ids: sections.map((s) => s.id),
      })
      .groupBy('student.sectionId')
      .getRawMany<{ sectionId: string; count: string }>();

    const countBySection = new Map(
      counts.map((row) => [row.sectionId, Number(row.count)]),
    );

    return sections.map((section) => ({
      ...section,
      studentCount: countBySection.get(section.id) ?? 0,
    }));
  }

  async update(
    currentUser: JwtPayload,
    id: string,
    dto: UpdateSectionDto,
  ): Promise<Section> {
    const section = await this.findByIdOrThrow(id);
    await this.assertOwnership(currentUser, section);

    const existing = await this.sectionsRepository.findOne({
      where: { classId: section.classId, name: dto.name },
    });
    if (existing && existing.id !== id) {
      throw new ConflictException(
        'A section with this name already exists in this class',
      );
    }

    section.name = dto.name;
    return this.sectionsRepository.save(section);
  }

  async remove(
    currentUser: JwtPayload,
    id: string,
  ): Promise<{ message: string }> {
    const section = await this.findByIdOrThrow(id);
    await this.assertOwnership(currentUser, section);
    await this.sectionsRepository.delete(id);
    return { message: 'Section deleted' };
  }

  async findByIdForClassOwnership(
    id: string,
    classId: string,
  ): Promise<Section> {
    const section = await this.findByIdOrThrow(id);
    if (section.classId !== classId) {
      throw new BadRequestException(
        'This section does not belong to the selected class',
      );
    }
    return section;
  }
}
