import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { loadEnvForCli } from "../src/config/env";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnvForCli();

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
        status: "active",
        users: {
          create: {
            email: "merchant2@harbor.demo",
            passwordHash,
            role: "merchant_admin",
          },
        },
        products: {
          create: [
            {
              title: "Heirloom Tomato Seeds",
              description: "Non-GMO seed pack for home gardeners.",
              slug: "heirloom-tomato-seeds",
              variants: {
                create: [
                  {
                    sku: "TOM-HEIR",
                    name: "10-Pack",
                    priceCents: 899,
                    stock: 300,
                  },
                ],
              },
            },
          ],
        },
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

    await prisma.order.create({
      data: {
        merchantId: demoMerchant.id,
        status: "paid",
        totalCents: 3798,
        currency: "USD",
        lines: {
          create: [
            {
              productTitle: "Organic Cotton Tote",
              variantName: "Natural",
              quantity: 1,
              unitPriceCents: 2499,
            },
            {
              productTitle: "Wildflower Honey",
              variantName: "8 oz Jar",
              quantity: 1,
              unitPriceCents: 1299,
            },
          ],
        },
      },
    });

    await prisma.order.create({
      data: {
        merchantId: demoMerchant.id,
        status: "shipped",
        totalCents: 4599,
        currency: "USD",
        lines: {
          create: [
            {
              productTitle: "Ceramic Pour-Over Set",
              variantName: "Standard",
              quantity: 1,
              unitPriceCents: 4599,
            },
          ],
        },
      },
    });

    await prisma.order.create({
      data: {
        merchantId: valleyOrganics.id,
        status: "placed",
        totalCents: 1798,
        currency: "USD",
        lines: {
          create: [
            {
              productTitle: "Heirloom Tomato Seeds",
              variantName: "10-Pack",
              quantity: 2,
              unitPriceCents: 899,
            },
          ],
        },
      },
    });

    console.log("Harbor seed complete");
    console.log("  Admin:     admin@harbor.demo / demo1234");
    console.log(
      "  Merchant:  merchant@harbor.demo / demo1234 (Harbor Demo Shop)"
    );
    console.log(
      "  Merchant2: merchant2@harbor.demo / demo1234 (Valley Organics)"
    );
    console.log(`  Merchants: 2 active, 1 pending`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
