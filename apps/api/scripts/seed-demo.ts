import bcrypt from 'bcryptjs'
import { env } from '../src/config/env'
import { PrismaClient, Prisma } from '../src/generated/tenant'

async function main() {
  const url = env.TENANT_DATABASE_URL
  const prisma = new PrismaClient({ datasources: { db: { url } } })
  console.log('Seeding tenant DB at:', url)

  // Create default boutique if not exists
  const boutique = await prisma.boutique.upsert({
    where: { code: 'bq-1' },
    update: {},
    create: { code: 'bq-1', name: 'Boutique Principale', city: 'Conakry', country: 'GN' }
  })

  // Create super admin user if not exists
  const email = 'admin@demo.local'
  const exists = await prisma.user.findUnique({ where: { email } })
  let user = exists
  if (!exists) {
    const passwordHash = await bcrypt.hash('Admin123!', 10)
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'Super Admin Demo',
        role: 'super_admin',
        status: 'active',
        emailVerifiedAt: new Date() // mark verified
      }
    })
    console.log('Created user:', email, 'password: Admin123!')
  } else {
    console.log('User already exists:', email)
  }

  // Create a sample product
  const product = await prisma.product.upsert({
    where: { sku: 'SKU-001' },
    update: {},
    create: {
      sku: 'SKU-001',
      name: 'Produit Démo',
      category: 'demo',
      price: new Prisma.Decimal(10000),
      cost: new Prisma.Decimal(7000),
      taxRate: new Prisma.Decimal(0)
    }
  })

  // Ensure stock exists for the product in boutique
  const stock = await prisma.stock.upsert({
    where: { boutiqueId_productId: { boutiqueId: boutique.id, productId: product.id } },
    update: { quantity: 100 },
    create: { boutiqueId: boutique.id, productId: product.id, quantity: 100 }
  })

  console.log('Boutique:', boutique.code, 'Product:', product.sku, 'Stock Qty:', stock.quantity)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  process.exitCode = 1
})
