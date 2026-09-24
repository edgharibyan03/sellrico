import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  APP_URL: Joi.string().uri().required(),
  API_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  CORS_ORIGINS: Joi.string().allow('').optional(),
  /** @deprecated Use OPENAI_API_KEY */
  AI_PROVIDER_API_KEY: Joi.string().allow('').optional(),
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),
  OPENAI_BASE_URL: Joi.string().uri().allow('').optional(),
  DEEPSEEK_API_KEY: Joi.string().allow('').optional(),
  DEEPSEEK_MODEL: Joi.string().default('deepseek-chat'),
  DEEPSEEK_BASE_URL: Joi.string().uri().default('https://api.deepseek.com'),
});
