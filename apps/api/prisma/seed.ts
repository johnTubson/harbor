import { config } from "dotenv";
import { resolve } from "node:path";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client";

config({ path: resolve(__dirname, "../../../.env") });

const DEMO_PASSWORD = "demo1234";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const passwordHash = await hash(DEMO_PASSWORD, 10);

  try {
    await prisma.auditLog.deleteMany();
    await prisma.orderLine.deleteMany();
    await prisma.order.deleteMany();
    await prisma.settlement.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.kycDocument.deleteMany();
    await prisma.user.deleteMany();
    await prisma.merchant.deleteMany();

    const admin = await prisma.user.create({
      data: {
        email: "admin@harbor.demo",
        passwordHash,
        role: "platform_admin",
      },
    });

    const demoMerchant = await prisma.merchant.create({
      data: {
        name: "Harbor Demo Shop",
        slug: "harbor-demo",
        status: "active",
        users: {
          create: {
            email: "merchant@harbor.demo",
            passwordHash,
            role: "merchant_admin",
          },
        },
        products: {
          create: [
            {
              title: "Organic Cotton Tote",
              description: "Reusable market tote made from organic cotton.",
              slug: "organic-cotton-tote",
              variants: {
                create: [
                  {
                    sku: "TOTE-NAT",
                    name: "Natural",
                    priceCents: 2499,
                    stock: 120,
                  },
                  {
                    sku: "TOTE-OLV",
                    name: "Olive",
                    priceCents: 2499,
                    stock: 85,
                  },
                ],
              },
            },
            {
              title: "Ceramic Pour-Over Set",
              description: "Hand-glazed ceramic dripper with glass carafe.",
              slug: "ceramic-pour-over-set",
              variants: {
                create: [
                  {
                    sku: "POUR-STD",
                    name: "Standard",
                    priceCents: 4599,
                    stock: 40,
                  },
                ],
              },
            },
            {
              title: "Wildflower Honey",
              description: "Small-batch honey from Pacific Northwest apiaries.",
              slug: "wildflower-honey",
              variants: {
                create: [
                  {
                    sku: "HNY-8OZ",
                    name: "8 oz Jar",
                    priceCents: 1299,
                    stock: 200,
                  },
                  {
                    sku: "HNY-16OZ",
                    name: "16 oz Jar",
                    priceCents: 2199,
                    stock: 150,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const pendingArtisan = await prisma.merchant.create({
      data: {
        name: "Pending Artisan Co",
        slug: "pending-artisan",
        status: "pending",
        kycDocuments: {
          create: [
            {
              type: "business_license",
              objectKey: "kyc/pending-artisan/business-license.pdf",
              fileName: "business-license.pdf",
            },
            {
              type: "government_id",
              objectKey: "kyc/pending-artisan/id-front.jpg",
              fileName: "id-front.jpg",
            },
          ],
        },
      },
    });

    const valleyOrganics = await prisma.merchant.create({
      data: {
        name: "Valley Organics",
        slug: "valley-organics",
        status: "pending",
        kycDocuments: {
          create: [
            {
              type: "tax_certificate",
              objectKey: "kyc/valley-organics/tax-cert.pdf",
              fileName: "tax-cert.pdf",
            },
          ],
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "seed.completed",
        entityType: "System",
        entityId: "seed",
        metadata: {
          merchants: [
            demoMerchant.slug,
            pendingArtisan.slug,
            valleyOrganics.slug,
          ],
        },
      },
    });

    console.log("Harbor seed complete");
    console.log("  Admin:    admin@harbor.demo / demo1234");
    console.log("  Merchant: merchant@harbor.demo / demo1234");
    console.log(`  Merchants: 1 active (${demoMerchant.name}), 2 pending`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
