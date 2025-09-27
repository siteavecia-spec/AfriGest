"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(name, def) {
    const val = process.env[name] ?? def;
    if (val === undefined)
        throw new Error(`Missing env ${name}`);
    return val;
}
exports.env = {
    PORT: Number(required('PORT', '4000')),
    JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'dev_access'),
    JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev_refresh'),
    MASTER_DATABASE_URL: required('MASTER_DATABASE_URL', 'postgresql://user:pass@localhost:5432/afrigest_master'),
    TENANT_DATABASE_URL: required('TENANT_DATABASE_URL', 'postgresql://user:pass@localhost:5432/afrigest_tenant_demo'),
    NODE_ENV: process.env.NODE_ENV || 'development',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '', // comma-separated list for non-dev CORS
    ACCESS_TTL: process.env.ACCESS_TTL || '15m',
    REFRESH_TTL: process.env.REFRESH_TTL || '30d'
};
