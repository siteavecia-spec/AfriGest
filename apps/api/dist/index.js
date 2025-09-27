"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const ws_1 = require("./ws");
const server = (0, http_1.createServer)(app_1.default);
const port = env_1.env.PORT;
// Initialize WebSocket server (AfriTalk Phase 4.2 S1)
(0, ws_1.initWS)(server);
server.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});
