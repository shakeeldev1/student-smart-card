import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { AreaManager } from '../../modules/area/entities/area-manager.entity';
import { AreaLevel } from '../../modules/area/enums/area-level.enum';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';

const DEMO_PASSWORD = 'StudentSmartCard@123';

type DemoAccount = {
  email: string;
  name: string;
  role: UserRole;
  area?: {
    level: AreaLevel;
    province: string;
    region?: string;
    district?: string;
  };
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'superadmin@gmail.com',
    name: 'Super Admin',
    role: UserRole.ADMIN,
  },
  { email: 'efu@gmail.com', name: 'EFU Admin', role: UserRole.EFU },
  {
    email: 'operator@gmail.com',
    name: 'Operations Manager',
    role: UserRole.OPERATOR,
  },
  { email: 'school@gmail.com', name: 'Demo School', role: UserRole.SCHOOL },
  { email: 'student@gmail.com', name: 'Demo Student', role: UserRole.STUDENT },
  {
    email: 'individual@gmail.com',
    name: 'Demo Individual',
    role: UserRole.INDIVIDUAL,
  },
  {
    email: 'provice@gmail.com',
    name: 'Demo Province Manager',
    role: UserRole.AREA_MANAGER,
    area: {
      level: AreaLevel.PROVINCE,
      province: 'Punjab',
    },
  },
  {
    email: 'district@gmail.com',
    name: 'Demo District Manager',
    role: UserRole.AREA_MANAGER,
    area: {
      level: AreaLevel.DISTRICT,
      province: 'Punjab',
      region: 'Lahore Division',
      district: 'Lahore',
    },
  },
  {
    email: 'region@gmail.com',
    name: 'Demo Region Manager',
    role: UserRole.AREA_MANAGER,
    area: {
      level: AreaLevel.REGION,
      province: 'Punjab',
      region: 'Lahore Division',
    },
  },
  {
    email: 'tehsil@gmail.com',
    name: 'Demo Tehsil Manager',
    role: UserRole.AREA_MANAGER,
    area: {
      level: AreaLevel.TEHSIL,
      province: 'Punjab',
      region: 'Lahore Division',
      district: 'Lahore',
    },
  },
];

async function main() {
  await dataSource.initialize();

  try {
    const usersRepository = dataSource.getRepository(User);
    const areaManagersRepository = dataSource.getRepository(AreaManager);
    const passwordHash = await bcrypt.hash(
      DEMO_PASSWORD,
      Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
    );

    for (const account of DEMO_ACCOUNTS) {
      const email = account.email.toLowerCase();
      let user = await usersRepository.findOne({ where: { email } });

      if (user) {
        user.name = account.name;
        user.role = account.role;
        user.passwordHash = passwordHash;
        user.emailVerified = true;
        user.isActive = true;
      } else {
        user = usersRepository.create({
          email,
          passwordHash,
          name: account.name,
          role: account.role,
          emailVerified: true,
          isActive: true,
        });
      }

      user = await usersRepository.save(user);

      if (account.area) {
        const areaManager =
          (await areaManagersRepository.findOne({ where: { userId: user.id } })) ??
          areaManagersRepository.create({ userId: user.id });

        areaManager.level = account.area.level;
        areaManager.province = account.area.province;
        areaManager.region = account.area.region ?? null;
        areaManager.district = account.area.district ?? null;
        areaManager.tehsil =
          account.area.level === AreaLevel.TEHSIL ? 'Lahore Tehsil' : null;
        areaManager.setupToken = null;
        areaManager.setupTokenExpiresAt = null;
        await areaManagersRepository.save(areaManager);
      }

      console.log(`${account.role.padEnd(12)} ${email}`);
    }

    console.log(`\nDemo accounts ready. Shared password: ${DEMO_PASSWORD}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Error creating demo accounts:', error);
  process.exit(1);
});
