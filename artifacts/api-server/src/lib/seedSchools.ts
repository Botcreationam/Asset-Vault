import { db } from "@workspace/db";
import { schoolsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ZAMBIAN_INSTITUTIONS = [
  { name: "Cavendish University Zambia", shortName: "CUZ", country: "Zambia" },
  { name: "Chalimbana University", shortName: "CU", country: "Zambia" },
  { name: "Copperbelt University", shortName: "CBU", country: "Zambia" },
  { name: "Copperstone University", shortName: "CSU", country: "Zambia" },
  { name: "DMI St. Eugene University", shortName: "DMI", country: "Zambia" },
  { name: "Domino Servite School of Theology", shortName: "DSST", country: "Zambia" },
  { name: "Eden University", shortName: "EU", country: "Zambia" },
  { name: "Evelyn Hone College", shortName: "EHC", country: "Zambia" },
  { name: "Graca Machel University", shortName: "GMU", country: "Zambia" },
  { name: "Greenfield University", shortName: "GU", country: "Zambia" },
  { name: "Information and Communications University", shortName: "ICU", country: "Zambia" },
  { name: "Institute of Distance Education", shortName: "IDE", country: "Zambia" },
  { name: "Kwame Nkrumah University", shortName: "KNU", country: "Zambia" },
  { name: "Livingstone International University", shortName: "LIU", country: "Zambia" },
  { name: "Lusaka Apex Medical University", shortName: "LAMU", country: "Zambia" },
  { name: "Mukuba University", shortName: "MU", country: "Zambia" },
  { name: "Mulungushi University", shortName: "MU2", country: "Zambia" },
  { name: "Northrise University", shortName: "NU", country: "Zambia" },
  { name: "Palabana University", shortName: "PU", country: "Zambia" },
  { name: "Rusangu University", shortName: "RU", country: "Zambia" },
  { name: "SOS Hermann Gmeiner International College", shortName: "HGIC", country: "Zambia" },
  { name: "University of Lusaka", shortName: "UNILUS", country: "Zambia" },
  { name: "University of Zambia", shortName: "UNZA", country: "Zambia" },
  { name: "Zambia Catholic University", shortName: "ZCU", country: "Zambia" },
  { name: "Zambia Centre for Accountancy Studies", shortName: "ZCAS", country: "Zambia" },
  { name: "Zambia Institute of Mass Communication", shortName: "ZAMCOM", country: "Zambia" },
  { name: "Zambian Open University", shortName: "ZAOU", country: "Zambia" },
];

export async function seedSchoolsIfEmpty() {
  try {
    const existing = await db
      .select({ id: schoolsTable.id })
      .from(schoolsTable)
      .limit(1);

    if (existing.length > 0) {
      console.log(`[seed] Schools already seeded — skipping`);
      return;
    }

    console.log(`[seed] Seeding ${ZAMBIAN_INSTITUTIONS.length} Zambian institutions...`);
    await db.insert(schoolsTable).values(
      ZAMBIAN_INSTITUTIONS.map((inst) => ({
        ...inst,
        isActive: true,
      }))
    );
    console.log(`[seed] Done — ${ZAMBIAN_INSTITUTIONS.length} institutions inserted`);
  } catch (err) {
    console.error("[seed] Failed to seed schools:", err);
  }
}
