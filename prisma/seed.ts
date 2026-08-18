import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { ensureDefaultJobTypes } from "../src/lib/job-types";
import { formatTicketNo } from "../src/lib/domain";

const prisma = new PrismaClient();

async function main() {
  await ensureDefaultJobTypes(prisma);

  await prisma.supplierLedgerEntry.deleteMany();
  await prisma.workOrderRepairItem.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.insuranceCompany.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      name: "Sistem Yöneticisi",
      email: "admin@asiston.com",
      password: await hashPassword("admin123"),
      role: "ADMIN",
    },
  });

  const planlama = await prisma.user.create({
    data: {
      username: "planlama",
      name: "Ayşe Koordinatör",
      email: "planlama@asiston.com",
      password: await hashPassword("plan123"),
      role: "PLANLAMA",
    },
  });

  const koordinator = await prisma.user.create({
    data: {
      username: "ahmet",
      name: "Ahmet Yıldız",
      email: "ahmet@asiston.com",
      password: await hashPassword("tek123"),
      role: "PLANLAMA",
    },
  });

  const companies = await Promise.all([
    prisma.insuranceCompany.create({
      data: {
        name: "Allianz Sigorta",
        shortCode: "ALL",
        city: "İstanbul",
        address: "Levent — Büyükdere Cad. No:12",
        contactPerson: "Emre Aydın",
        phone: "0212 111 0101",
        email: "operasyon@allianz.example",
        assistanceContactName: "Asistans Hattı",
        assistancePhone: "0850 111 0101",
        accountManagerName: "Deniz Öztürk",
        accountManagerPhone: "0533 222 0101",
      },
    }),
    prisma.insuranceCompany.create({
      data: {
        name: "Anadolu Sigorta",
        shortCode: "ANADOLU",
        city: "İstanbul",
        address: "Altunizade — Kısıklı Cad. No:42",
        contactPerson: "Burak Şahin",
        phone: "0216 111 0202",
        email: "operasyon@anadolu.example",
        assistanceContactName: "7/24 Asistans",
        assistancePhone: "0850 111 0202",
        accountManagerName: "Gül Yıldız",
        accountManagerPhone: "0533 222 0202",
      },
    }),
    prisma.insuranceCompany.create({
      data: {
        name: "Axa Sigorta",
        shortCode: "AXA",
        city: "Ankara",
        address: "Kızılay — Atatürk Bulvarı No:8",
        contactPerson: "Can Demir",
        phone: "0312 111 0303",
        email: "operasyon@axa.example",
        assistanceContactName: "Yol Yardım",
        assistancePhone: "0850 111 0303",
        accountManagerName: "Selin Arslan",
        accountManagerPhone: "0533 222 0303",
      },
    }),
    prisma.insuranceCompany.create({
      data: {
        name: "Mapfre Sigorta",
        shortCode: "MAPFRE",
        city: "İzmir",
        address: "Alsancak — Kordon Boyu No:22",
        contactPerson: "Elif Kaya",
        phone: "0232 111 0404",
        email: "operasyon@mapfre.example",
        assistanceContactName: "Asistans Merkezi",
        assistancePhone: "0850 111 0404",
        accountManagerName: "Ahmet Yılmaz",
        accountManagerPhone: "0533 222 0404",
      },
    }),
  ]);

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        firstName: "Mehmet",
        lastName: "Kaya",
        iban: "TR330006100519786457841326",
        city: "İstanbul",
        district: "Ümraniye",
        phone: "0532 111 22 33",
        notes: "7/24 çekici ve yol yardımı",
        balance: 0,
      },
    }),
    prisma.supplier.create({
      data: {
        firstName: "Ali",
        lastName: "Demir",
        iban: "TR640001000000000000000001",
        city: "Ankara",
        district: "Çankaya",
        phone: "0533 444 55 66",
        notes: "İkame araç ve mini onarım",
        balance: 0,
      },
    }),
  ]);

  const ticket1 = formatTicketNo(1);
  const ticket2 = formatTicketNo(2);
  const ticket3 = formatTicketNo(3);
  const ticket4 = formatTicketNo(4);

  await prisma.workOrder.create({
    data: {
      ticketNo: ticket1,
      title: "2026-000101",
      asistansDosyaNo: "AST-2026-0001",
      insuredFirstName: "Mehmet",
      insuredLastName: "Yılmaz",
      insuredPhone: "0532 111 22 33",
      insuredAddress: "Atatürk Bulvarı No:12",
      insuredCity: "Ankara",
      insuredDistrict: "Çankaya",
      description: "TEM Otoyolu Ankara yönünde motor arızası. Araç emniyet şeridinde, sürücü güvende.",
      jobType: "YOL_YARDIMI",
      status: "ISLEMDE",
      priority: "YUKSEK",
      insuranceCompanyId: companies[0].id,
      assignedToId: koordinator.id,
    },
  });

  await prisma.workOrder.create({
    data: {
      ticketNo: ticket2,
      title: "2026-000102",
      asistansDosyaNo: "AST-2026-0002",
      insuredFirstName: "Ayşe",
      insuredLastName: "Demir",
      insuredPhone: "0542 333 44 55",
      insuredCity: "İstanbul",
      insuredDistrict: "Kadıköy",
      description: "Hafif çarpma sonrası araç kullanılamaz durumda. 3 günlük ikame araç talebi.",
      jobType: "IKAME_ARAC",
      status: "YENI_IS",
      priority: "ACIL",
      insuranceCompanyId: companies[1].id,
    },
  });

  await prisma.workOrder.create({
    data: {
      ticketNo: ticket3,
      title: "2026-000103",
      asistansDosyaNo: "AST-2026-0003",
      insuredFirstName: "Ali",
      insuredLastName: "Kaya",
      insuredPhone: "0555 666 77 88",
      insuredCity: "İzmir",
      insuredDistrict: "Konak",
      description: "Otoyol taş çarpması sonucu ön cam çatlağı. Mini onarım mümkün değil.",
      jobType: "CAM_HASAR",
      status: "ISLEMDE",
      priority: "NORMAL",
      insuranceCompanyId: companies[2].id,
      assignedToId: koordinator.id,
    },
  });

  await prisma.workOrder.create({
    data: {
      ticketNo: ticket4,
      title: "2026-000104",
      asistansDosyaNo: "AST-2026-0004",
      insuredFirstName: "Fatma",
      insuredLastName: "Öztürk",
      insuredPhone: "0506 888 99 00",
      insuredAddress: "Cumhuriyet Cad. 45",
      insuredCity: "Bursa",
      insuredDistrict: "Nilüfer",
      description: "Uzun yol arızası nedeniyle sürücü ve yolcular için otel konaklaması sağlandı.",
      jobType: "KONAKLAMA",
      status: "TAMAMLANDI",
      priority: "NORMAL",
      insuranceCompanyId: companies[3].id,
      assignedToId: koordinator.id,
      supplierId: suppliers[0].id,
      completedAt: new Date(Date.now() - 7 * 86400000),
      invoiceAmount: 8500,
      supplierCost: 5200,
      repairItems: {
        create: [
          { description: "Otel konaklama (2 gece)", amount: 4200, sortOrder: 0 },
          { description: "Transfer hizmeti", amount: 1000, sortOrder: 1 },
          { description: "Koordinasyon bedeli", amount: 3300, sortOrder: 2 },
        ],
      },
    },
  });

  const completedOrder = await prisma.workOrder.findFirst({ where: { ticketNo: ticket4 } });
  await prisma.supplierLedgerEntry.create({
    data: {
      type: "HIZMET",
      supplierId: suppliers[0].id,
      workOrderId: completedOrder!.id,
      amount: 5200,
      description: `${ticket4} asistans dosyası hizmet bedeli`,
    },
  });
  await prisma.supplier.update({
    where: { id: suppliers[0].id },
    data: { balance: 5200 },
  });

  console.log("Seed tamamlandı.");
  void admin;
  void planlama;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
