# Database Seeds

This folder contains seed scripts for initializing default admin and operator accounts.

## Available Seeds

### Admin Account (EFU Role)

Creates a default admin account with EFU (system admin) role.

```bash
npm run seed:admin
```

**Default credentials:**
- Email: `admin@studentsmartcard.com`
- Password: `AdminDefault@123`
- Name: `Admin`

**Custom credentials:**
```bash
npm run seed:admin -- <email> <password> <name>
```

Example:
```bash
npm run seed:admin -- myemail@example.com MySecurePassword123 "My Admin Name"
```

### Operator Account

Creates an operator account for reviewing applications and managing operations.

```bash
npm run seed:operator -- <email> <password> [name]
```

Example:
```bash
npm run seed:operator -- operator@example.com OperatorPassword123 "Operator Name"
```

## Setup Instructions

1. **Run migrations first:**
   ```bash
   npm run migration:run
   ```

2. **Create default admin:**
   ```bash
   npm run seed:admin
   ```

3. **Login with default credentials:**
   - Email: `admin@studentsmartcard.com`
   - Password: `AdminDefault@123`

4. **Change password after first login:**
   - Go to profile/settings and update your password

## Notes

- Both seeds check if the account already exists and won't create duplicates
- Accounts are created with `emailVerified: true` (no email verification needed)
- Accounts are created with `isActive: true` (can be used immediately)
- If an account already exists, the script will skip creation and exit cleanly
