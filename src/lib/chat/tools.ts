import { AffectedModel } from '@/types/chat'
import { tool } from 'ai'
import { z } from 'zod'
import { prisma } from '../prisma'
import { computeInstallmentStatus } from '../loan-status'
export type ToolsResult = {
  method: string, model_affected: {
    model: AffectedModel,
    id: string[]
  }[], payload: any
}
const defaultToolResult: ToolsResult = {
  method: '',
  model_affected: [],
  payload: {}
}
export const getCurrentDate = tool({
  description:
    `Mengembalikan tanggal dan waktu saat ini.

WAJIB gunakan tool ini sebelum melakukan pencarian yang membutuhkan
interpretasi tanggal relatif seperti:
- hari ini
- kemarin
- besok
- minggu ini
- bulan ini
- bulan lalu
- tahun ini
- last month
- this month
- today
- yesterday

Gunakan tanggal dari hasil tool ini sebagai acuan untuk menghitung
startDate dan endDate pada tool lain.`,

  inputSchema: z.object({}),

  execute: async () => {
    const now = new Date()

    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return {
      timezone: 'Asia/Jakarta',
      iso: now.toISOString(),
      date: formatter.format(now),
    }
  },
})
export const createGetBorrowersTools = (toolsResults: ToolsResult[]) => {
  return tool({
    description: `Gunakan tool ini untuk mengambil daftar peminjam/nasabah pinjaman.

Gunakan ketika pengguna meminta:
- daftar peminjam
- daftar nasabah pinjaman
- data peminjam
- informasi peminjam
- cari peminjam berdasarkan nama
- peminjam aktif atau tidak aktif

Data peminjam memiliki:
- name: nama peminjam
- phone: nomor telepon
- identityNumber: nomor identitas
- address: alamat
- occupation: pekerjaan
- businessName: nama usaha
- notes: catatan
- status: AKTIF atau NONAKTIF

Filter yang tersedia:
- name: pencarian berdasarkan nama peminjam
- phone: pencarian berdasarkan nomor telepon
- identityNumber: pencarian berdasarkan nomor identitas
- status: AKTIF atau NONAKTIF
- occupation: pencarian berdasarkan pekerjaan
- businessName: pencarian berdasarkan nama usaha
- startDate: tanggal mulai berdasarkan createdAt, format YYYY-MM-DD
- endDate: tanggal akhir berdasarkan createdAt, format YYYY-MM-DD

Semua filter bersifat opsional.
Jika pengguna tidak menentukan filter, tampilkan semua peminjam.
Gunakan pencarian yang tidak case-sensitive untuk field teks.`,
    inputSchema: z.object({
      name: z
        .string()
        .optional()
        .describe('Nama peminjam atau bagian dari nama'),

      phone: z
        .string()
        .optional()
        .describe('Nomor telepon atau bagian dari nomor telepon'),

      identityNumber: z
        .string()
        .optional()
        .describe('Nomor identitas atau bagian dari nomor identitas'),

      status: z
        .enum(['AKTIF', 'TIDAK_AKTIF'])
        .optional()
        .describe('Status peminjam'),

      occupation: z
        .string()
        .optional()
        .describe('Pekerjaan peminjam'),

      businessName: z
        .string()
        .optional()
        .describe('Nama usaha peminjam'),

      startDate: z
        .string()
        .optional()
        .describe('Tanggal mulai berdasarkan createdAt, format YYYY-MM-DD'),

      endDate: z
        .string()
        .optional()
        .describe('Tanggal akhir berdasarkan createdAt, format YYYY-MM-DD'),
    }),

    execute: async ({
      name,
      phone,
      identityNumber,
      status,
      occupation,
      businessName,
      startDate,
      endDate,
    }) => {
      const borrowers = await prisma.borrower.findMany({
        where: {
          ...(name
            ? {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            }
            : {}),

          ...(phone
            ? {
              phone: {
                contains: phone,
                mode: 'insensitive',
              },
            }
            : {}),

          ...(identityNumber
            ? {
              identityNumber: {
                contains: identityNumber,
                mode: 'insensitive',
              },
            }
            : {}),

          ...(status
            ? {
              status,
            }
            : {}),

          ...(occupation
            ? {
              occupation: {
                contains: occupation,
                mode: 'insensitive',
              },
            }
            : {}),

          ...(businessName
            ? {
              businessName: {
                contains: businessName,
                mode: 'insensitive',
              },
            }
            : {}),

          ...(startDate || endDate
            ? {
              createdAt: {
                ...(startDate
                  ? {
                    gte: new Date(`${startDate}T00:00:00.000`),
                  }
                  : {}),

                ...(endDate
                  ? {
                    lte: new Date(`${endDate}T23:59:59.999`),
                  }
                  : {}),
              },
            }
            : {}),
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

      toolsResults.push({
        method: 'GET_BORROWERS',
        model_affected: [
          {
            id: borrowers.map((item) => item.id),
            model: 'borrower',
          },
        ],
        payload: {
          name,
          phone,
          identityNumber,
          status,
          occupation,
          businessName,
          startDate,
          endDate,
        },
      });

      return borrowers;
    },
  });
};
export const createGetLoanTermsTools = (toolsResults: ToolsResult[]) => {
  return tool({
    description: `Gunakan tool ini untuk mengambil daftar tenor atau ketentuan pinjaman.

Gunakan ketika pengguna meminta:
- daftar tenor
- tenor pinjaman
- ketentuan pinjaman
- pilihan tenor
- bunga pinjaman
- tenor aktif
- informasi tenor

Data tenor memiliki:
- name: nama tenor
- months: jumlah periode cicilan
- period: periode cicilan, misalnya BULANAN
- interestRate: tingkat bunga
- isActive: apakah tenor masih aktif

Filter yang tersedia:
- name: pencarian berdasarkan nama tenor
- period: periode cicilan
- minMonths: jumlah periode minimum
- maxMonths: jumlah periode maksimum
- minInterestRate: bunga minimum
- maxInterestRate: bunga maksimum
- isActive: status aktif/nonaktif
- startDate: tanggal mulai berdasarkan createdAt, format YYYY-MM-DD
- endDate: tanggal akhir berdasarkan createdAt, format YYYY-MM-DD

Semua filter bersifat opsional.`,
    inputSchema: z.object({
      name: z
        .string()
        .optional()
        .describe('Nama tenor atau bagian dari nama'),

      period: z
        .enum(['BULANAN', 'MINGGUAN'])
        .optional()
        .describe('Periode cicilan'),

      minMonths: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jumlah periode minimum'),

      maxMonths: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jumlah periode maksimum'),

      minInterestRate: z
        .number()
        .optional()
        .describe('Tingkat bunga minimum'),

      maxInterestRate: z
        .number()
        .optional()
        .describe('Tingkat bunga maksimum'),

      isActive: z
        .boolean()
        .optional()
        .describe('Filter berdasarkan status aktif'),

      startDate: z
        .string()
        .optional()
        .describe('Tanggal mulai berdasarkan createdAt, format YYYY-MM-DD'),

      endDate: z
        .string()
        .optional()
        .describe('Tanggal akhir berdasarkan createdAt, format YYYY-MM-DD'),
    }),

    execute: async ({
      name,
      period,
      minMonths,
      maxMonths,
      minInterestRate,
      maxInterestRate,
      isActive,
      startDate,
      endDate,
    }) => {
      const loanTerms = await prisma.loanTerm.findMany({
        where: {
          ...(name
            ? {
              name: {
                contains: name,
                mode: 'insensitive',
              },
            }
            : {}),

          ...(period
            ? {
              period,
            }
            : {}),

          ...(minMonths !== undefined || maxMonths !== undefined
            ? {
              months: {
                ...(minMonths !== undefined
                  ? {
                    gte: minMonths,
                  }
                  : {}),

                ...(maxMonths !== undefined
                  ? {
                    lte: maxMonths,
                  }
                  : {}),
              },
            }
            : {}),

          ...(minInterestRate !== undefined ||
            maxInterestRate !== undefined
            ? {
              interestRate: {
                ...(minInterestRate !== undefined
                  ? {
                    gte: minInterestRate,
                  }
                  : {}),

                ...(maxInterestRate !== undefined
                  ? {
                    lte: maxInterestRate,
                  }
                  : {}),
              },
            }
            : {}),

          ...(isActive !== undefined
            ? {
              isActive,
            }
            : {}),

          ...(startDate || endDate
            ? {
              createdAt: {
                ...(startDate
                  ? {
                    gte: new Date(`${startDate}T00:00:00.000`),
                  }
                  : {}),

                ...(endDate
                  ? {
                    lte: new Date(`${endDate}T23:59:59.999`),
                  }
                  : {}),
              },
            }
            : {}),
        },

        orderBy: {
          months: 'asc',
        },
      });

      toolsResults.push({
        method: 'GET_LOAN_TERMS',
        model_affected: [
          {
            id: loanTerms.map((item) => item.id),
            model: 'loan_term',
          },
        ],
        payload: {
          name,
          period,
          minMonths,
          maxMonths,
          minInterestRate,
          maxInterestRate,
          isActive,
          startDate,
          endDate,
        },
      });

      return loanTerms;
    },
  });
};

export const createGetLoansTools = (toolsResults: ToolsResult[]) => {
  return tool({
    description: `Gunakan tool ini untuk mengambil daftar pinjaman warga.

Gunakan ketika pengguna meminta:
- daftar pinjaman
- data pinjaman
- informasi pinjaman
- pinjaman aktif
- pinjaman lunas
- pinjaman berdasarkan nomor
- pinjaman milik seseorang
- pinjaman berdasarkan nama peminjam
- jumlah pinjaman
- detail pinjaman

Data pinjaman memiliki:
- loanNumber: nomor pinjaman
- borrower: peminjam
- principalAmount: jumlah pokok pinjaman
- interestRate: tingkat bunga
- interestAmount: jumlah bunga
- totalAmount: total pinjaman
- monthlyInstallment: jumlah cicilan per periode
- termMonths: jumlah periode cicilan
- period: periode cicilan
- disbursementDate: tanggal pencairan
- firstDueDate: tanggal jatuh tempo pertama
- purpose: tujuan pinjaman
- notes: catatan
- status: status pinjaman
- loanTerm: ketentuan tenor yang digunakan

Filter yang tersedia:
- loanNumber: nomor pinjaman
- borrowerId: ID peminjam
- borrowerName: nama peminjam
- borrowerPhone: nomor telepon peminjam
- status: status pinjaman
- period: periode cicilan
- minPrincipalAmount: pokok pinjaman minimum
- maxPrincipalAmount: pokok pinjaman maksimum
- minTotalAmount: total pinjaman minimum
- maxTotalAmount: total pinjaman maksimum
- minTermMonths: jumlah periode minimum
- maxTermMonths: jumlah periode maksimum
- minInterestRate: bunga minimum
- maxInterestRate: bunga maksimum
- disbursementStartDate: tanggal pencairan mulai, format YYYY-MM-DD
- disbursementEndDate: tanggal pencairan akhir, format YYYY-MM-DD
- dueStartDate: jatuh tempo pertama mulai, format YYYY-MM-DD
- dueEndDate: jatuh tempo pertama akhir, format YYYY-MM-DD

Semua filter bersifat opsional.
Jika pengguna meminta informasi berdasarkan nama peminjam, gunakan borrowerName.

Gunakan pencarian yang tidak case-sensitive untuk field teks.`,
    inputSchema: z.object({
      loanNumber: z
        .string()
        .optional()
        .describe('Nomor pinjaman atau bagian dari nomor pinjaman'),

      borrowerId: z
        .string()
        .optional()
        .describe('ID peminjam'),

      borrowerName: z
        .string()
        .optional()
        .describe('Nama peminjam atau bagian dari nama'),

      borrowerPhone: z
        .string()
        .optional()
        .describe('Nomor telepon peminjam atau bagian dari nomor'),

      status: z
        .enum([
          'DRAFT',
          'AKTIF',
          'LUNAS',
          'DIBATALKAN'
        ])
        .optional()
        .describe('Status pinjaman'),

      period: z
        .enum(['MINGGUAN', 'BULANAN'])
        .optional()
        .describe('Periode cicilan'),

      minPrincipalAmount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Pokok pinjaman minimum'),

      maxPrincipalAmount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Pokok pinjaman maksimum'),

      minTotalAmount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Total pinjaman minimum'),

      maxTotalAmount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Total pinjaman maksimum'),

      minTermMonths: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jumlah periode cicilan minimum'),

      maxTermMonths: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jumlah periode cicilan maksimum'),

      minInterestRate: z
        .number()
        .optional()
        .describe('Tingkat bunga minimum'),

      maxInterestRate: z
        .number()
        .optional()
        .describe('Tingkat bunga maksimum'),

      disbursementStartDate: z
        .string()
        .optional()
        .describe('Tanggal pencairan mulai, format YYYY-MM-DD'),

      disbursementEndDate: z
        .string()
        .optional()
        .describe('Tanggal pencairan akhir, format YYYY-MM-DD'),

      dueStartDate: z
        .string()
        .optional()
        .describe('Tanggal jatuh tempo pertama mulai, format YYYY-MM-DD'),

      dueEndDate: z
        .string()
        .optional()
        .describe('Tanggal jatuh tempo pertama akhir, format YYYY-MM-DD'),
    }),

    execute: async ({
      loanNumber,
      borrowerId,
      borrowerName,
      borrowerPhone,
      status,
      period,
      minPrincipalAmount,
      maxPrincipalAmount,
      minTotalAmount,
      maxTotalAmount,
      minTermMonths,
      maxTermMonths,
      minInterestRate,
      maxInterestRate,
      disbursementStartDate,
      disbursementEndDate,
      dueStartDate,
      dueEndDate,
    }) => {
      const loans = await prisma.loan.findMany({
        where: {
          ...(loanNumber
            ? {
              loanNumber: {
                contains: loanNumber,
                mode: 'insensitive',
              },
            }
            : {}),

          ...(borrowerId
            ? {
              borrowerId,
            }
            : {}),

          ...(borrowerName || borrowerPhone
            ? {
              borrower: {
                ...(borrowerName
                  ? {
                    name: {
                      contains: borrowerName,
                      mode: 'insensitive',
                    },
                  }
                  : {}),

                ...(borrowerPhone
                  ? {
                    phone: {
                      contains: borrowerPhone,
                      mode: 'insensitive',
                    },
                  }
                  : {}),
              },
            }
            : {}),

          ...(status
            ? {
              status,
            }
            : {}),

          ...(period
            ? {
              period,
            }
            : {}),

          ...(minPrincipalAmount !== undefined ||
            maxPrincipalAmount !== undefined
            ? {
              principalAmount: {
                ...(minPrincipalAmount !== undefined
                  ? {
                    gte: minPrincipalAmount,
                  }
                  : {}),

                ...(maxPrincipalAmount !== undefined
                  ? {
                    lte: maxPrincipalAmount,
                  }
                  : {}),
              },
            }
            : {}),

          ...(minTotalAmount !== undefined ||
            maxTotalAmount !== undefined
            ? {
              totalAmount: {
                ...(minTotalAmount !== undefined
                  ? {
                    gte: minTotalAmount,
                  }
                  : {}),

                ...(maxTotalAmount !== undefined
                  ? {
                    lte: maxTotalAmount,
                  }
                  : {}),
              },
            }
            : {}),

          ...(minTermMonths !== undefined ||
            maxTermMonths !== undefined
            ? {
              termMonths: {
                ...(minTermMonths !== undefined
                  ? {
                    gte: minTermMonths,
                  }
                  : {}),

                ...(maxTermMonths !== undefined
                  ? {
                    lte: maxTermMonths,
                  }
                  : {}),
              },
            }
            : {}),

          ...(minInterestRate !== undefined ||
            maxInterestRate !== undefined
            ? {
              interestRate: {
                ...(minInterestRate !== undefined
                  ? {
                    gte: minInterestRate,
                  }
                  : {}),

                ...(maxInterestRate !== undefined
                  ? {
                    lte: maxInterestRate,
                  }
                  : {}),
              },
            }
            : {}),

          ...(disbursementStartDate || disbursementEndDate
            ? {
              disbursementDate: {
                ...(disbursementStartDate
                  ? {
                    gte: new Date(
                      `${disbursementStartDate}T00:00:00.000`
                    ),
                  }
                  : {}),

                ...(disbursementEndDate
                  ? {
                    lte: new Date(
                      `${disbursementEndDate}T23:59:59.999`
                    ),
                  }
                  : {}),
              },
            }
            : {}),

          ...(dueStartDate || dueEndDate
            ? {
              firstDueDate: {
                ...(dueStartDate
                  ? {
                    gte: new Date(`${dueStartDate}T00:00:00.000`),
                  }
                  : {}),

                ...(dueEndDate
                  ? {
                    lte: new Date(`${dueEndDate}T23:59:59.999`),
                  }
                  : {}),
              },
            }
            : {}),
        },

        include: {
          borrower: true,
          loanTerm: true,
        },

        orderBy: {
          disbursementDate: 'desc',
        },
      });

      toolsResults.push({
        method: 'GET_LOANS',
        model_affected: [
          {
            id: loans.map((item) => item.id),
            model: 'loan',
          },
        ],
        payload: {
          loanNumber,
          borrowerId,
          borrowerName,
          borrowerPhone,
          status,
          period,
          minPrincipalAmount,
          maxPrincipalAmount,
          minTotalAmount,
          maxTotalAmount,
          minTermMonths,
          maxTermMonths,
          minInterestRate,
          maxInterestRate,
          disbursementStartDate,
          disbursementEndDate,
          dueStartDate,
          dueEndDate,
        },
      });

      return loans;
    },
  });
};
export const createGetInstallmentsTools = (toolsResults: ToolsResult[]) => {
  return tool({
    description: `
Gunakan tool ini untuk mengambil data cicilan.

Gunakan untuk pertanyaan tentang:
- cicilan
- jatuh tempo
- cicilan terlambat
- cicilan yang belum dibayar
- cicilan yang sudah lunas

Status cicilan DIHITUNG dari paidAt dan dueDate, bukan dari field status database:

- Jika paidAt ada → LUNAS
- Jika paidAt tidak ada dan dueDate sebelum hari ini → TERLAMBAT
- Jika paidAt tidak ada dan dueDate hari ini → JATUH_TEMPO
- Jika paidAt tidak ada dan dueDate setelah hari ini → BELUM_JATUH_TEMPO

Jika user meminta beberapa status, status dapat berisi lebih dari satu nilai.

Contoh:
"cicilan jatuh tempo dan terlambat"
→ status: ["JATUH_TEMPO", "TERLAMBAT"]

"cicilan belum lunas"
→ status: ["BELUM_JATUH_TEMPO", "JATUH_TEMPO", "TERLAMBAT"]

Jangan menebak filter. Jika maksud user tidak jelas, tanyakan klarifikasi.
`,
    inputSchema: z.object({
      borrowerName: z
        .string()
        .optional()
        .describe("Nama peminjam, jika disebutkan oleh user"),

      loanNumber: z
        .string()
        .optional()
        .describe("Nomor pinjaman, jika disebutkan oleh user"),

      status: z
        .array(
          z.enum([
            "BELUM_JATUH_TEMPO",
            "JATUH_TEMPO",
            "TERLAMBAT",
            "LUNAS",
          ])
        )
        .optional()
        .describe("Satu atau beberapa status cicilan"),

      dueStartDate: z
        .string()
        .optional()
        .describe("Tanggal mulai jatuh tempo dalam format YYYY-MM-DD"),

      dueEndDate: z
        .string()
        .optional()
        .describe("Tanggal akhir jatuh tempo dalam format YYYY-MM-DD"),
    }),

    execute: async ({
      borrowerName,
      loanNumber,
      status,
      dueStartDate,
      dueEndDate,
    }) => {
      const installments = await prisma.installment.findMany({
        where: {
          ...(loanNumber
            ? {
              loan: {
                loanNumber,
              },
            }
            : {}),

          ...(borrowerName
            ? {
              loan: {
                borrower: {
                  name: {
                    contains: borrowerName,
                    mode: "insensitive",
                  },
                },
              },
            }
            : {}),

          ...(dueStartDate || dueEndDate
            ? {
              dueDate: {
                ...(dueStartDate
                  ? {
                    gte: new Date(
                      `${dueStartDate}T00:00:00.000`
                    ),
                  }
                  : {}),
                ...(dueEndDate
                  ? {
                    lte: new Date(
                      `${dueEndDate}T23:59:59.999`
                    ),
                  }
                  : {}),
              },
            }
            : {}),
        },

        include: {
          loan: {
            include: {
              borrower: true,
            },
          },
          payments: true,
        },

        orderBy: {
          dueDate: "asc",
        },
      });

      const now = new Date();

      const result = installments
        .map((installment) => ({
          ...installment,
          computedStatus: computeInstallmentStatus(
            installment,
            now
          ),
        }))
        .filter((installment) => {
          if (!status?.length) return true;

          return status.includes(installment.computedStatus);
        });

      toolsResults.push({
        method: "GET_INSTALLMENTS",
        model_affected: [
          {
            id: result.map((i) => i.id),
            model: "installment",
          },
        ],
        payload: {
          borrowerName,
          loanNumber,
          status,
          dueStartDate,
          dueEndDate,
        },
      });

      return result;
    },
  });
};
export const createGetPaymentsTools = (toolsResults: ToolsResult[]) => {
  return tool({
    description: `Gunakan tool ini untuk mengambil daftar pembayaran cicilan.

Gunakan ketika pengguna meminta:
- daftar pembayaran
- riwayat pembayaran
- pembayaran cicilan
- pembayaran pinjaman
- pembayaran berdasarkan nama peminjam
- pembayaran berdasarkan nomor pinjaman
- pembayaran pada tanggal tertentu
- total pembayaran
- detail pembayaran

Data pembayaran memiliki:
- installment: cicilan terkait
- amount: jumlah pembayaran
- paidAt: tanggal pembayaran
- notes: catatan
- receipt: bukti pembayaran

Filter yang tersedia:
- installmentId: ID cicilan
- loanId: ID pinjaman
- loanNumber: nomor pinjaman
- borrowerName: nama peminjam
- borrowerPhone: nomor telepon peminjam
- minAmount: jumlah pembayaran minimum
- maxAmount: jumlah pembayaran maksimum
- startDate: tanggal pembayaran mulai, format YYYY-MM-DD
- endDate: tanggal pembayaran akhir, format YYYY-MM-DD
- hasReceipt: apakah pembayaran memiliki bukti pembayaran

Semua filter bersifat opsional.

Jika pengguna menggunakan tanggal relatif seperti "hari ini",
"minggu ini", atau "bulan ini", gunakan getCurrentDate terlebih dahulu.`,
    inputSchema: z.object({
      installmentId: z
        .string()
        .optional()
        .describe('ID cicilan'),

      loanId: z
        .string()
        .optional()
        .describe('ID pinjaman'),

      loanNumber: z
        .string()
        .optional()
        .describe('Nomor pinjaman atau bagian dari nomor pinjaman'),

      borrowerName: z
        .string()
        .optional()
        .describe('Nama peminjam atau bagian dari nama'),

      borrowerPhone: z
        .string()
        .optional()
        .describe('Nomor telepon peminjam atau bagian dari nomor'),

      minAmount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Jumlah pembayaran minimum'),

      maxAmount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Jumlah pembayaran maksimum'),

      startDate: z
        .string()
        .optional()
        .describe('Tanggal pembayaran mulai, format YYYY-MM-DD'),

      endDate: z
        .string()
        .optional()
        .describe('Tanggal pembayaran akhir, format YYYY-MM-DD'),

      hasReceipt: z
        .boolean()
        .optional()
        .describe('Filter berdasarkan ada atau tidaknya bukti pembayaran'),
    }),

    execute: async ({
      installmentId,
      loanId,
      loanNumber,
      borrowerName,
      borrowerPhone,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      hasReceipt,
    }) => {
      const payments = await prisma.payment.findMany({
        where: {
          ...(installmentId
            ? {
              installmentId,
            }
            : {}),

          ...(loanId || loanNumber || borrowerName || borrowerPhone
            ? {
              installment: {
                ...(loanId
                  ? {
                    loanId,
                  }
                  : {}),

                loan:
                  loanNumber || borrowerName || borrowerPhone
                    ? {
                      ...(loanNumber
                        ? {
                          loanNumber: {
                            contains: loanNumber,
                            mode: 'insensitive',
                          },
                        }
                        : {}),

                      ...(borrowerName || borrowerPhone
                        ? {
                          borrower: {
                            ...(borrowerName
                              ? {
                                name: {
                                  contains: borrowerName,
                                  mode: 'insensitive',
                                },
                              }
                              : {}),

                            ...(borrowerPhone
                              ? {
                                phone: {
                                  contains: borrowerPhone,
                                  mode: 'insensitive',
                                },
                              }
                              : {}),
                          },
                        }
                        : {}),
                    }
                    : undefined,
              },
            }
            : {}),

          ...(minAmount !== undefined || maxAmount !== undefined
            ? {
              amount: {
                ...(minAmount !== undefined
                  ? {
                    gte: minAmount,
                  }
                  : {}),

                ...(maxAmount !== undefined
                  ? {
                    lte: maxAmount,
                  }
                  : {}),
              },
            }
            : {}),

          ...(startDate || endDate
            ? {
              paidAt: {
                ...(startDate
                  ? {
                    gte: new Date(`${startDate}T00:00:00.000`),
                  }
                  : {}),

                ...(endDate
                  ? {
                    lte: new Date(`${endDate}T23:59:59.999`),
                  }
                  : {}),
              },
            }
            : {}),

          ...(hasReceipt !== undefined
            ? {
              receipt: hasReceipt
                ? {
                  not: null,
                }
                : null,
            }
            : {}),
        },

        include: {
          installment: {
            include: {
              loan: {
                include: {
                  borrower: true,
                  loanTerm: true,
                },
              },
            },
          },
        },

        orderBy: {
          paidAt: 'desc',
        },
      });

      toolsResults.push({
        method: 'GET_PAYMENTS',
        model_affected: [
          {
            id: payments.map((item) => item.id),
            model: 'payment',
          },
        ],
        payload: {
          installmentId,
          loanId,
          loanNumber,
          borrowerName,
          borrowerPhone,
          minAmount,
          maxAmount,
          startDate,
          endDate,
          hasReceipt,
        },
      });

      return payments;
    },
  });
};