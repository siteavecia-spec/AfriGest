"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversations_1 = __importDefault(require("./conversations"));
const conversation_1 = __importDefault(require("./conversation"));
const message_1 = __importDefault(require("./message"));
const read_1 = __importDefault(require("./read"));
const notifications_1 = __importDefault(require("./notifications"));
const presence_1 = __importDefault(require("./presence"));
const router = (0, express_1.Router)({ mergeParams: true });
// Conversations list
router.use('/:tenantId/messaging/conversations', conversations_1.default);
// Conversation messages with a specific peer
router.use('/:tenantId/messaging/conversation', conversation_1.default);
// Send message
router.use('/:tenantId/messaging/message', message_1.default);
// Mark message as read
router.use('/:tenantId/messaging', read_1.default);
// Notifications (in-app)
router.use('/:tenantId/notifications', notifications_1.default);
// Presence snapshot
router.use('/:tenantId/presence', presence_1.default);
exports.default = router;
