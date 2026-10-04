import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(true),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  OTP_LENGTH: Joi.number().default(6),
  OTP_EXPIRES_IN_MINUTES: Joi.number().default(10),
  OTP_MAX_ATTEMPTS: Joi.number().default(5),
  OTP_HASH_PEPPER: Joi.string().min(8).required(),

  BCRYPT_SALT_ROUNDS: Joi.number().default(10),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default(
    'Student Smart Card <no-reply@studentsmartcard.pk>',
  ),
  // Where replies should go (helps deliverability + user trust). Defaults to
  // MAIL_FROM's address when unset.
  MAIL_REPLY_TO: Joi.string().allow('').default(''),
  // DKIM signing (optional but strongly recommended for inbox placement).
  // Set all three to sign outgoing mail with your domain key.
  DKIM_DOMAIN: Joi.string().allow('').default(''),
  DKIM_SELECTOR: Joi.string().allow('').default(''),
  DKIM_PRIVATE_KEY: Joi.string().allow('').default(''),

  CORS_ORIGIN: Joi.string().default('https://studentsmartcardpak.com'),
  FRONTEND_URL: Joi.string().uri().optional(),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(20),

  ECOMMERCE_API_KEY: Joi.string().min(16).required(),

  // How long a newly issued card is valid for.
  CARD_VALIDITY_MONTHS: Joi.number().integer().min(1).default(12),
});
