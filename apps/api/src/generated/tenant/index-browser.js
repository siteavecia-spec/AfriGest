
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  fullName: 'fullName',
  role: 'role',
  status: 'status',
  lastLoginAt: 'lastLoginAt',
  emailVerifiedAt: 'emailVerifiedAt'
};

exports.Prisma.BoutiqueScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  address: 'address',
  city: 'city',
  country: 'country'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  sku: 'sku',
  name: 'name',
  category: 'category',
  price: 'price',
  cost: 'cost',
  barcode: 'barcode',
  taxRate: 'taxRate',
  isActive: 'isActive',
  sector: 'sector',
  attrs: 'attrs'
};

exports.Prisma.StockScalarFieldEnum = {
  id: 'id',
  boutiqueId: 'boutiqueId',
  productId: 'productId',
  quantity: 'quantity'
};

exports.Prisma.SupplierScalarFieldEnum = {
  id: 'id',
  name: 'name',
  contactName: 'contactName',
  phone: 'phone',
  email: 'email',
  address: 'address'
};

exports.Prisma.StockEntryScalarFieldEnum = {
  id: 'id',
  supplierId: 'supplierId',
  reference: 'reference',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt'
};

exports.Prisma.StockEntryItemScalarFieldEnum = {
  id: 'id',
  stockEntryId: 'stockEntryId',
  productId: 'productId',
  quantity: 'quantity',
  unitCost: 'unitCost'
};

exports.Prisma.StockAuditScalarFieldEnum = {
  id: 'id',
  boutiqueId: 'boutiqueId',
  productId: 'productId',
  delta: 'delta',
  reason: 'reason',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.SaleScalarFieldEnum = {
  id: 'id',
  boutiqueId: 'boutiqueId',
  cashierUserId: 'cashierUserId',
  total: 'total',
  paymentMethod: 'paymentMethod',
  currency: 'currency',
  createdAt: 'createdAt',
  offlineId: 'offlineId',
  status: 'status'
};

exports.Prisma.SaleItemScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  productId: 'productId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  discount: 'discount'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  method: 'method',
  amount: 'amount',
  reference: 'reference'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  role: 'role',
  action: 'action',
  resourceId: 'resourceId',
  metadata: 'metadata',
  ip: 'ip',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetRequestScalarFieldEnum = {
  id: 'id',
  userEmail: 'userEmail',
  phone: 'phone',
  resetMethod: 'resetMethod',
  resetToken: 'resetToken',
  otpCode: 'otpCode',
  expiresAt: 'expiresAt',
  used: 'used',
  ip: 'ip',
  userAgent: 'userAgent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefreshSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  refreshToken: 'refreshToken',
  userAgent: 'userAgent',
  ip: 'ip',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt'
};

exports.Prisma.EmailVerificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  email: 'email',
  token: 'token',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ReferralCodeScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  code: 'code',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.ReferralRequestScalarFieldEnum = {
  id: 'id',
  referralCodeId: 'referralCodeId',
  prospectEmail: 'prospectEmail',
  prospectPhone: 'prospectPhone',
  companyName: 'companyName',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.ReferralRewardScalarFieldEnum = {
  id: 'id',
  referrerId: 'referrerId',
  referredUserId: 'referredUserId',
  rewardType: 'rewardType',
  rewardValue: 'rewardValue',
  status: 'status',
  paidAt: 'paidAt',
  createdAt: 'createdAt'
};

exports.Prisma.SectorTemplateScalarFieldEnum = {
  id: 'id',
  key: 'key',
  name: 'name',
  isSystem: 'isSystem',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SectorAttributeScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  key: 'key',
  label: 'label',
  type: 'type',
  required: 'required'
};

exports.Prisma.TenantCustomAttributeScalarFieldEnum = {
  id: 'id',
  sectorKey: 'sectorKey',
  key: 'key',
  label: 'label',
  type: 'type',
  required: 'required',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Role = exports.$Enums.Role = {
  super_admin: 'super_admin',
  pdg: 'pdg',
  dg: 'dg',
  employee: 'employee'
};

exports.ResetMethod = exports.$Enums.ResetMethod = {
  email: 'email',
  sms: 'sms'
};

exports.ReferralRequestStatus = exports.$Enums.ReferralRequestStatus = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected'
};

exports.RewardStatus = exports.$Enums.RewardStatus = {
  pending: 'pending',
  paid: 'paid',
  cancelled: 'cancelled'
};

exports.AttrType = exports.$Enums.AttrType = {
  string: 'string',
  number: 'number',
  date: 'date',
  text: 'text'
};

exports.Prisma.ModelName = {
  User: 'User',
  Boutique: 'Boutique',
  Product: 'Product',
  Stock: 'Stock',
  Supplier: 'Supplier',
  StockEntry: 'StockEntry',
  StockEntryItem: 'StockEntryItem',
  StockAudit: 'StockAudit',
  Sale: 'Sale',
  SaleItem: 'SaleItem',
  Payment: 'Payment',
  AuditLog: 'AuditLog',
  PasswordResetRequest: 'PasswordResetRequest',
  RefreshSession: 'RefreshSession',
  EmailVerification: 'EmailVerification',
  ReferralCode: 'ReferralCode',
  ReferralRequest: 'ReferralRequest',
  ReferralReward: 'ReferralReward',
  SectorTemplate: 'SectorTemplate',
  SectorAttribute: 'SectorAttribute',
  TenantCustomAttribute: 'TenantCustomAttribute'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
