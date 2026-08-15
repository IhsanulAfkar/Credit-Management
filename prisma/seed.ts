
import { calculateLoan, generateDueDates } from "../src/lib/loan-calculator";
import { auth } from "../src/lib/auth";
import { prisma } from "@/lib/prisma";


function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

interface SeedLoanInput {
  borrowerId: string;
  loanTermId: string;
  principal: number;
  disbursementDate: Date;
  firstDueDate: Date;
  purpose: string;
  notes?: string;
  /** Number of installments to mark as paid (from the start). */
  paidCount: number;
  /** If true, mark the loan as LUNAS (all installments paid). */
  paidOff?: boolean;
  /** If true, leave some due installments unpaid to simulate lateness. */
  late?: boolean;
}

async function createLoan(input: SeedLoanInput) {
  const term = await prisma.loanTerm.findUniqueOrThrow({
    where: { id: input.loanTermId },
  });

  const calc = calculateLoan(input.principal, term.interestRate, term.months);
  const dueDates = generateDueDates(input.firstDueDate, term.months);

  const loanCount = await prisma.loan.count();
  const loanNumber = `LN-${String(loanCount + 1).padStart(6, "0")}`;

  const loan = await prisma.loan.create({
    data: {
      loanNumber,
      borrowerId: input.borrowerId,
      loanTermId: term.id,
      principalAmount: calc.principal,
      interestRate: calc.interestRate,
      interestAmount: calc.interestAmount,
      totalAmount: calc.totalAmount,
      monthlyInstallment: calc.monthlyInstallment,
      termMonths: calc.tenorMonths,
      disbursementDate: input.disbursementDate,
      firstDueDate: input.firstDueDate,
      purpose: input.purpose,
      notes: input.notes,
      status: input.paidOff ? "LUNAS" : "AKTIF",
    },
  });

  for (let i = 0; i < calc.tenorMonths; i++) {
    const isPaid = input.paidOff || i < input.paidCount;
    const paidAt = isPaid ? new Date(dueDates[i]) : null;
    if (paidAt) paidAt.setHours(10, 0, 0, 0);

    const installment = await prisma.installment.create({
      data: {
        loanId: loan.id,
        installmentNumber: i + 1,
        dueDate: dueDates[i],
        amount: calc.installmentAmounts[i],
        paidAmount: isPaid ? calc.installmentAmounts[i] : 0,
        paidAt,
        status: isPaid ? "LUNAS" : "BELUM_JATUH_TEMPO",
      },
    });

    // Create payment history record for audit trail.
    if (isPaid) {
      await prisma.payment.create({
        data: {
          installmentId: installment.id,
          amount: calc.installmentAmounts[i],
          paidAt: paidAt!,
          notes: "Pembayaran cicilan",
        },
      });
    }
  }

  return loan;
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data (in dependency order)
  await prisma.payment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.borrower.deleteMany();
  await prisma.loanTerm.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create default admin user via Better Auth
  await auth.api.signUpEmail({
    body: {
      email: "admin@kreditku.id",
      password: "admin123",
      name: "Admin KreditKu",
    },
  });
  console.log("Admin user created: admin@kreditku.id / admin123");

  // --- Loan Terms ---
  const term3 = await prisma.loanTerm.create({
    data: { name: "3 Bulan", months: 3, interestRate: 10, isActive: true },
  });
  const term6 = await prisma.loanTerm.create({
    data: { name: "6 Bulan", months: 6, interestRate: 15, isActive: true },
  });
  const term9 = await prisma.loanTerm.create({
    data: { name: "9 Bulan", months: 9, interestRate: 20, isActive: true },
  });
  const term12 = await prisma.loanTerm.create({
    data: { name: "12 Bulan", months: 12, interestRate: 25, isActive: true },
  });

  // --- Borrowers ---
  const borrowers = [
    {
      name: "Budi Santoso",
      phone: "081234567890",
      identityNumber: "3171010101900001",
      address: "Jl. Merdeka No. 12, Jakarta Pusat",
      occupation: "Pedagang",
      businessName: "Toko Sembako Budi",
      notes: "Pelanggan tetap sejak 2023.",
    },
    {
      name: "Siti Rahayu",
      phone: "081298765432",
      identityNumber: "3273010202910002",
      address: "Jl. Melati No. 5, Bandung",
      occupation: "Penjual Makanan",
      businessName: "Warung Nasi Siti",
      notes: "",
    },
    {
      name: "Agus Wijaya",
      phone: "085612345678",
      identityNumber: "3171020303920003",
      address: "Jl. Kenanga No. 8, Jakarta Selatan",
      occupation: "Bengkel",
      businessName: "Bengkel Agus Motor",
      notes: "Pernah telat 1 bulan pada pinjaman sebelumnya.",
    },
    {
      name: "Dewi Lestari",
      phone: "082134567890",
      identityNumber: "3273040504930004",
      address: "Jl. Anggrek No. 3, Bekasi",
      occupation: "Karyawan Swasta",
      businessName: "",
      notes: "",
    },
    {
      name: "Rudi Hartono",
      phone: "081377788899",
      identityNumber: "3171050605940005",
      address: "Jl. Cempaka No. 21, Depok",
      occupation: "Peternak",
      businessName: "Peternakan Ayam Rudi",
      notes: "Pinjaman untuk modal pakan.",
    },
    {
      name: "Maya Anggraini",
      phone: "085788899900",
      identityNumber: "3273060706950006",
      address: "Jl. Flamboyan No. 9, Tangerang",
      occupation: "Penjual Online",
      businessName: "Toko Online Maya",
      notes: "",
    },
    {
      name: "Joko Susilo",
      phone: "081299988877",
      identityNumber: "3171070808960007",
      address: "Jl. Mawar No. 15, Jakarta Timur",
      occupation: "Tukang Bangunan",
      businessName: "",
      notes: "",
    },
    {
      name: "Ratna Sari",
      phone: "082199988877",
      identityNumber: "3273080909970008",
      address: "Jl. Dahlia No. 2, Bogor",
      occupation: "Penjahit",
      businessName: "Konveksi Ratna",
      notes: "",
    },
  ];

  const createdBorrowers = [];
  for (const b of borrowers) {
    const borrower = await prisma.borrower.create({ data: b });
    createdBorrowers.push(borrower);
  }

  const [budi, siti, agus, dewi, rudi, maya, joko, ratna] = createdBorrowers;

  // --- Loans ---

  // Active loan: Budi, 12 months, 4 paid, 8 remaining
  await createLoan({
    borrowerId: budi.id,
    loanTermId: term12.id,
    principal: 10000000,
    disbursementDate: monthsAgo(5),
    firstDueDate: monthsAgo(4),
    purpose: "Modal usaha toko sembako",
    paidCount: 4,
  });

  // Active loan: Siti, 6 months, 2 paid, 4 remaining
  await createLoan({
    borrowerId: siti.id,
    loanTermId: term6.id,
    principal: 5000000,
    disbursementDate: monthsAgo(3),
    firstDueDate: monthsAgo(2),
    purpose: "Modal warung nasi",
    paidCount: 2,
  });

  // Late loan: Agus, 9 months, 3 paid, missed 2 due dates
  await createLoan({
    borrowerId: agus.id,
    loanTermId: term9.id,
    principal: 8000000,
    disbursementDate: monthsAgo(6),
    firstDueDate: monthsAgo(5),
    purpose: "Modal bengkel",
    paidCount: 3,
    late: true,
  });

  // Paid-off loan: Dewi, 12 months, all paid
  await createLoan({
    borrowerId: dewi.id,
    loanTermId: term12.id,
    principal: 6000000,
    disbursementDate: monthsAgo(13),
    firstDueDate: monthsAgo(12),
    purpose: "Biaya pernikahan",
    paidCount: 12,
    paidOff: true,
  });

  // Active loan: Rudi, 6 months, 1 paid, 5 remaining
  await createLoan({
    borrowerId: rudi.id,
    loanTermId: term6.id,
    principal: 12000000,
    disbursementDate: monthsAgo(2),
    firstDueDate: monthsAgo(1),
    purpose: "Modal pakan ayam",
    paidCount: 1,
  });

  // Active loan: Maya, 3 months, 0 paid, first due soon
  await createLoan({
    borrowerId: maya.id,
    loanTermId: term3.id,
    principal: 3000000,
    disbursementDate: daysFromNow(-20),
    firstDueDate: daysFromNow(10),
    purpose: "Modal restock barang",
    paidCount: 0,
  });

  // Active loan: Joko, 9 months, 5 paid, 4 remaining
  await createLoan({
    borrowerId: joko.id,
    loanTermId: term9.id,
    principal: 7000000,
    disbursementDate: monthsAgo(6),
    firstDueDate: monthsAgo(5),
    purpose: "Modal renovasi rumah",
    paidCount: 5,
  });

  // Active loan: Ratna, 12 months, 6 paid, 6 remaining
  await createLoan({
    borrowerId: ratna.id,
    loanTermId: term12.id,
    principal: 15000000,
    disbursementDate: monthsAgo(7),
    firstDueDate: monthsAgo(6),
    purpose: "Modal konveksi",
    paidCount: 6,
  });

  // Second loan for Budi: 6 months, 1 paid
  await createLoan({
    borrowerId: budi.id,
    loanTermId: term6.id,
    principal: 4000000,
    disbursementDate: monthsAgo(2),
    firstDueDate: monthsAgo(1),
    purpose: "Tambah stok sembako",
    paidCount: 1,
  });

  // Paid-off loan: Siti, 3 months, all paid
  await createLoan({
    borrowerId: siti.id,
    loanTermId: term3.id,
    principal: 2000000,
    disbursementDate: monthsAgo(4),
    firstDueDate: monthsAgo(3),
    purpose: "Modal awal warung",
    paidCount: 3,
    paidOff: true,
  });

  console.log("Seeding complete!");
  console.log(`Borrowers: ${createdBorrowers.length}`);
  console.log(`Loans: ${await prisma.loan.count()}`);
  console.log(`Installments: ${await prisma.installment.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });