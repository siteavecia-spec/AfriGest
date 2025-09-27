"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMasterPrisma = getMasterPrisma;
let client = null;
function getMasterPrisma() {
    let MasterCtor = null;
    try {
        // eslint-disable-next-line no-eval
        const req = eval('require');
        MasterCtor = req('../generated/master').PrismaClient;
    }
    catch {
        MasterCtor = null;
    }
    if (!MasterCtor)
        return null;
    if (!client) {
        client = new MasterCtor();
    }
    return client;
}
