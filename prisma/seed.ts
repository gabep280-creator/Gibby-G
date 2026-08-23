import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const FLAVORS = [
  { sku: "NPR-SP-001", name: "Salt & Pepper" },
  { sku: "NPR-BBQ-002", name: "Spicy BBQ" },
  { sku: "NPR-DP-003", name: "Spicy Dill Pickle" },
];

// A handful of real Charlotte, NC area retail addresses to make the map
// view useful out of the box. Lat/lng are approximate geocodes for each
// address so the app has pins without requiring a live geocoding call.
const SAMPLE_LOCATIONS = [
  {
    name: "Uptown Corner Mart",
    address: "201 S Tryon St, Charlotte, NC 28202",
    lat: 35.2251,
    lng: -80.8433,
    storeType: "Convenience",
    contactName: "Dana Price",
    contactPhone: "704-555-0101",
    visitFrequency: "weekly",
  },
  {
    name: "NoDa Quick Stop",
    address: "3213 N Davidson St, Charlotte, NC 28205",
    lat: 35.2465,
    lng: -80.8046,
    storeType: "Convenience",
    contactName: "Marcus Lee",
    contactPhone: "704-555-0102",
    visitFrequency: "weekly",
  },
  {
    name: "South End Grocery",
    address: "1420 South Blvd, Charlotte, NC 28203",
    lat: 35.2118,
    lng: -80.8578,
    storeType: "Grocery",
    contactName: "Priya Natarajan",
    contactPhone: "704-555-0103",
    visitFrequency: "biweekly",
  },
  {
    name: "Plaza Midwood Fuel & Snacks",
    address: "1601 Central Ave, Charlotte, NC 28205",
    lat: 35.2183,
    lng: -80.8104,
    storeType: "Gas Station",
    contactName: "Tyler Ford",
    contactPhone: "704-555-0104",
    visitFrequency: "weekly",
  },
  {
    name: "Dilworth Deli & Market",
    address: "1508 East Blvd, Charlotte, NC 28203",
    lat: 35.2043,
    lng: -80.8391,
    storeType: "Deli",
    contactName: "Grace Kim",
    contactPhone: "704-555-0105",
    visitFrequency: "biweekly",
  },
  {
    name: "Steele Creek Fuel Stop",
    address: "9101 Steele Creek Rd, Charlotte, NC 28273",
    lat: 35.1554,
    lng: -80.9601,
    storeType: "Gas Station",
    contactName: "Omar Haddad",
    contactPhone: "704-555-0106",
    visitFrequency: "monthly",
  },
];

async function main() {
  console.log("Seeding products...");
  const products = await Promise.all(
    FLAVORS.map((f) =>
      prisma.product.upsert({
        where: { sku: f.sku },
        update: { name: f.name },
        create: f,
      })
    )
  );
  console.log(`  ${products.length} products ready.`);

  console.log("Seeding sample locations...");
  const locations = [];
  for (const loc of SAMPLE_LOCATIONS) {
    const existing = await prisma.location.findFirst({
      where: { name: loc.name },
    });
    const location = existing
      ? await prisma.location.update({ where: { id: existing.id }, data: loc })
      : await prisma.location.create({ data: loc });
    locations.push(location);
  }
  console.log(`  ${locations.length} locations ready.`);

  // Seed a mix of sales so grading has something interesting to show.
  console.log("Seeding sample sales records...");
  const saltPepper = products.find((p) => p.sku === "NPR-SP-001")!;
  const bbq = products.find((p) => p.sku === "NPR-BBQ-002")!;
  const dillPickle = products.find((p) => p.sku === "NPR-DP-003")!;

  // [saltPepper, bbq, dillPickle] units per location, tuned to produce a
  // spread of A/B/C grades across the sample data.
  const salesByLocation: Record<string, [number, number, number]> = {
    "Uptown Corner Mart": [40, 38, 10],
    "NoDa Quick Stop": [12, 30, 28],
    "South End Grocery": [50, 15, 48],
    "Plaza Midwood Fuel & Snacks": [20, 20, 6],
    "Dilworth Deli & Market": [8, 22, 21],
    "Steele Creek Fuel Stop": [33, 9, 30],
  };

  for (const location of locations) {
    const units = salesByLocation[location.name];
    if (!units) continue;
    const existingRecords = await prisma.salesRecord.count({
      where: { locationId: location.id },
    });
    if (existingRecords > 0) continue; // don't duplicate on re-seed

    await prisma.salesRecord.createMany({
      data: [
        { locationId: location.id, productId: saltPepper.id, unitsSold: units[0] },
        { locationId: location.id, productId: bbq.id, unitsSold: units[1] },
        { locationId: location.id, productId: dillPickle.id, unitsSold: units[2] },
      ],
    });
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
