import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../modules/users/enums/user-role.enum';

async function main() {
  const email = process.argv[2] ?? process.env.SEED_OPERATOR_EMAIL;
  const password = process.argv[3] ?? process.env.SEED_OPERATOR_PASSWORD;
  const name = process.argv[4] ?? process.env.SEED_OPERATOR_NAME ?? 'Operator';

  if (!email || !password) {
    console.error(
      'Usage: npm run seed:operator -- <email> <password> [name]\n' +
        '(or set SEED_OPERATOR_EMAIL / SEED_OPERATOR_PASSWORD / SEED_OPERATOR_NAME)',
    );
    process.exit(1);
  }

  await dataSource.initialize();
  const usersRepository = dataSource.getRepository(User);

  const existing = await usersRepository.findOne({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    console.error(
      `A user with email ${email} already exists (role: ${existing.role}).`,
    );
    await dataSource.destroy();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(
    password,
    Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  );

  const operator = usersRepository.create({
    email: email.toLowerCase(),
    passwordHash,
    name,
    role: UserRole.OPERATOR,
    emailVerified: true,
    isActive: true,
  });
  await usersRepository.save(operator);

  console.log(
    `Operator account created: ${operator.email} (id: ${operator.id})`,
  );
  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);
  await dataSource.destroy();
  process.exit(1);
});
