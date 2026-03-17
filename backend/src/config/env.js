'use strict'

const fs = require("fs");
const path = require("path");
const dotenv = require('dotenv')
const { z } = require("zod");

process.env.APP_STAGE =
  process.env.APP_STAGE || process.env.NODE_ENV || "development";

const envFileByStage = {
  development: ".env",
  test: ".env.test",
  production: ".env",
};

const loadEnvFiles = () => {
  const selectedFile = envFileByStage[process.env.APP_STAGE] || ".env";
  const candidates = [
    path.resolve(__dirname, "../../", selectedFile),
    path.resolve(__dirname, "../../", ".env"),
    path.resolve(process.cwd(), selectedFile),
    path.resolve(process.cwd(), ".env"),
  ];

  const loaded = new Set();
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath) || loaded.has(filePath)) continue;
    dotenv.config({ path: filePath });
    loaded.add(filePath);
  }
};

loadEnvFiles();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_STAGE: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  YT_TRANSCRIPT_API_KEY: z.string().min(1).optional(),
  YT_DLP_PATH: z.string().min(1).optional(),
  YT_COOKIES_B64: z.string().min(1).optional(),
  RESIDENTIAL_PROXY_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n[Env] Invalid environment variables:\n");
  const { fieldErrors } = parsed.error.flatten();

  Object.entries(fieldErrors).forEach(([key, messages]) => {
    if (messages && messages.length > 0) {
      console.error(`- ${key}: ${messages.join(", ")}`);
    }
  });

  process.exit(1);
}

const env = parsed.data;
env.NODE_ENV = env.APP_STAGE;

const isDev = env.NODE_ENV === 'development'
const isProd = env.NODE_ENV === 'production'
const isTesting = env.NODE_ENV === "test";

module.exports = { env, isDev, isProd, isTesting };