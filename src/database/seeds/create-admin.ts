import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';

async function main() {
  const email = process.argv[2] ?? 'admin@studentsmartcard.com';
  const password = process.argv[3] ?? 'AdminDefault@123';
  const name = process.argv[4] ?? 'Admin';

  console.log(`Creating admin account...`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Name: ${name}`);

  await dataSource.initialize();
  const usersRepository = dataSource.getRepository(User);

  const existing = await usersRepository.findOne({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    console.log(
      `✓ Admin account already exists: ${email} (role: ${existing.role})`,
    );
    await dataSource.destroy();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  );

  const admin = usersRepository.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    role: UserRole.ADMIN,
    emailVerified: true,
    isActive: true,
  });
  await usersRepository.save(admin);

  console.log(`\n✅ Admin account created successfully!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${admin.role}`);
  console.log(`ID: ${admin.id}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\nℹ️  You can now login with these credentials.`);
  console.log(`⚠️  Please change the password after first login!`);

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error('❌ Error creating admin account:', error.message);
  await dataSource.destroy();
  process.exit(1);
});
