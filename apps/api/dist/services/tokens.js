"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function signAccessToken(userId, role) {
    const opts = { expiresIn: env_1.env.ACCESS_TTL };
    return jsonwebtoken_1.default.sign({ sub: userId, role }, env_1.env.JWT_ACCESS_SECRET, opts);
}
function signRefreshToken(userId, role) {
    const opts = { expiresIn: env_1.env.REFRESH_TTL };
    return jsonwebtoken_1.default.sign({ sub: userId, role, typ: 'refresh' }, env_1.env.JWT_REFRESH_SECRET, opts);
}
function verifyRefreshToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
    return payload;
}
