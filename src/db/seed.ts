import { db } from "./db.ts";
import { users, roles, medicines } from "./schema.ts";
import bcrypt from "bcrypt";

async function seed() {
  // Seed roles
  await db
    .insert(roles)
    .values([
      { id: 1, name: "admin" },
      { id: 2, name: "user" },
    ])
    .onConflictDoNothing();

  // Seed admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await db
    .insert(users)
    .values({
      name: "Admin",
      password: hashedPassword,
      rolesId: 1,
      noHp: "08123456789",
    })
    .onConflictDoNothing();

  // Seed medicines
  const medicineNames = [
    "Acyclovir 400 mg",
    "Amlodipin 5 mg",
    "Amlodipin 10 mg",
    "Antasida DOEN",
    "Ambroxol",
    "Allopurinol 100 mg",
    "Amytriptillin 25 mg",
    "Asam Mefenamat 500 mg",
    "Amoxicillin 500 mg",
    "Amoxicillin sirup 250 mg",
    "Aminophyllin 200 mg",
    "Attapulgit",
    "Besi II Sulfat (Tablet Tambah Darah)",
    "Betahistin Mesilate 6 mg",
    "Bisoprolol 2,5 mg",
    "Bromhexin 8 mg",
    "Captopril 12,5 mg",
    "Captopril 25 mg",
    "Captopril 50 mg",
    "Calcium Lactat",
    "Candesartan 8 mg",
    "Candesartan 16 mg",
    "Cetirizine 10 mg",
    "Cefadroxil 500 mg",
    "Chloramfenicol 250 mg",
    "Ciprofloxacin 500 mg",
    "CTM (Chlorfeniraminamaleas) 4 mg",
    "Dexamethasone 0,5 mg",
    "Dimenhydrinate 50 mg",
    "Domperidone 10 mg",
    "Gemfibrozil 300 mg",
    "Furosemide 40 mg",
    "Glibenclamide 5 mg",
    "Guaiafenesin (Gliserilguaiacolate)",
    "Glimepiride 2 mg",
    "Hidrochlorothiazide (HCT) 25 mg",
    "Hyoscine Butilbromide",
    "Ibuprofen 400 mg",
    "Ibuprofen 200 mg",
    "Isosorbid dinitrate 5 mg",
    "Irbesartan 150 mg",
    "Loratadine 10 mg",
    "Loperamide HCl 2 mg",
    "Cotrimoxazole 480 mg",
    "Metformin HCl 500 mg",
    "Methylprednisolone 4 mg",
    "Methylergometrin 0,125 mg",
    "Metronidazole 500 mg",
    "Natrium Diclofenac 25 mg",
    "Natrium Diclofenac 50 mg",
    "N-Acetylsisteine 200 mg",
    "Omeprazole 20 mg",
    "Ondansetron 4 mg",
    "Paracetamol 500 mg",
    "Prednison 5 mg",
    "Ranitidin 150 mg",
    "Salbutamol 2 mg",
    "Simvastatin 10 mg",
    "Vitamin B1 (Thiamin HCl) 50 mg",
    "Vitamin B6 (Piridoksin HCl) 10 mg",
    "Vitamin B12 (Cyanocobalamin) 10 mcg",
    "Vitamin B Complex",
    "Vitamin C (Asam Askorbat) 50 mg",
    "Vitamin K (Phytomenadion) 10 mg",
    "Zinc Sulfat Monohydrate 20 mg",
    "Aspilet (Asam Asetilsalisilat) 80 mg",
    "Ketokonazole 200 mg",
    "Asam Tranexamat 500 mg",
    "Vitamin A 200.000 IU",
    "Vitamin A 100.000 IU",
    "Nifedipine 10 mg",
    "Diazepam 2 mg",
    "Fenobarbital 30 mg",
    "Trihexyphenidil HCl 2 mg",
    "Haloperidol 5 mg",
    "Propylthiouracil (PTU) 100 mg",
    "Chlorpromazine HCl 100 mg",
    "Pil KB Kombinasi",
    "Trifluoroperazine HCl 5 mg",
    "Digoxin 0,25 mg",
    "Natrium Fenitoin 100 mg",
    "Risperidone 2 mg",
    "Sirup Cotrimoxazol 240 mg/ 5 ml",
    "Sirup ambroxol 30 mg/ 5 ml",
    "Sirup Cetirizine 5 mg/ 5 ml",
    "Sirup Paracetamol 120 mg/ 5 ml",
    "Sirup Antasida 200 mg/ 5 ml",
    "Ibuprofen 100 mg/ 5 ml",
    "Nystatin Drops 15 ml",
    "OBH Molex 60 ml",
    "Herbakof sirup",
    "Acyclovir salep",
    "Antibakteri salep",
    "Bethametason salep",
    "Hidrokortison salep",
    "Ketokonazole salep",
    "Kloramfenikol salep mata",
    "Kloramfenikol tetes mata",
    "Kloramfenikol tetes telinga",
    "Salep 2-4",
    "Salep Whitefield",
    "Bedak Salisil",
    "Silver Sulfadiazine",
    "Nystatin tab vaginal",
    "Permethrine salep",
    "Kloramfenikol salep kulit",
    "Phenol Glicerol tetes telinga",
    "Gentamisin tetes mata",
    "Miconazole salep",
    "Garam Oralit",
    "TLD (Tenofovir, Lamivudine, Dolutegravir)",
    "Obat Anti TBC Kategori I Dewasa",
    "Obat Anti TBC Kategori I Anak",
    "Metoclopramide HCl 10 mg",
    "Albendazole 400 mg",
  ];

  const medicineData = medicineNames.map((name) => ({
    name,
    stock: 20,
  }));

  await db.insert(medicines).values(medicineData).onConflictDoNothing();

  console.log("✅ Seeding selesai.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seeding gagal:", e);
  process.exit(1);
});
