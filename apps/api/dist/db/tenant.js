"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantPrisma = getTenantPrisma;
const clients = new Map();
function getTenantPrisma(databaseUrl) {
    // Dynamic load to keep memory mode working without generated Prisma client
    let PrismaClientCtor = null;
    try {
        // use eval to avoid static analysis
        // eslint-disable-next-line no-eval
        const req = eval('require');
        PrismaClientCtor = req('../generated/tenant').PrismaClient;
    }
    catch {
        PrismaClientCtor = null;
    }
    if (!PrismaClientCtor)
        return null;
    let client = clients.get(databaseUrl);
    if (!client) {
        client = new PrismaClientCtor({
            datasources: {
                db: { url: databaseUrl }
            }
        });
        clients.set(databaseUrl, client);
    }
    return client;
}
