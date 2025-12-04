import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const catNames = ["Mie", "Minuman", "Snacks"];
  const cats = [];
  for (const name of catNames) {
    const existing = await prisma.category.findFirst({ where: { name } });
    const cat =
      existing ??
      (await prisma.category.create({
        data: { name },
      }));
    cats.push(cat);
  }

  const byName = Object.fromEntries(cats.map((c) => [c.name, c.id]));

  const products = [
    // Mie
    {
      name: "Mie Goreng",
      categoryId: Number(byName["Mie"]),
      price: "20000",
      base_duration_seconds: 420,
      complexity_score: 5,
      is_quick_job: false,
      is_available: true,
    },
    {
      name: "Mie Kuah",
      categoryId: Number(byName["Mie"]),
      price: "22000",
      base_duration_seconds: 450,
      complexity_score: 6,
      is_quick_job: false,
      is_available: true,
    },
    // Minuman
    {
      name: "Es Teh Manis",
      categoryId: Number(byName["Minuman"]),
      price: "5000",
      base_duration_seconds: 60,
      complexity_score: 1,
      is_quick_job: true,
      is_available: true,
    },
    {
      name: "Lemon Tea",
      categoryId: Number(byName["Minuman"]),
      price: "8000",
      base_duration_seconds: 90,
      complexity_score: 2,
      is_quick_job: true,
      is_available: true,
    },
    // Snacks
    {
      name: "Kerupuk",
      categoryId: Number(byName["Snacks"]),
      price: "3000",
      base_duration_seconds: 30,
      complexity_score: 1,
      is_quick_job: true,
      is_available: true,
    },
    {
      name: "Siomay",
      categoryId: Number(byName["Snacks"]),
      price: "12000",
      base_duration_seconds: 300,
      complexity_score: 3,
      is_quick_job: false,
      is_available: true,
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, categoryId: p.categoryId } });
    if (existing) continue;
    await prisma.product.create({ data: p });
  }

  const table12 = await prisma.table.findFirst({ where: { table_number: "12" } });
  if (!table12) {
    await prisma.table.create({ data: { table_number: "12", qr_code_string: "12", is_occupied: false } });
  }

  console.log("Seed completed: categories, products, and sample table.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
