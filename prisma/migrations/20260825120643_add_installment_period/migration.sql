-- CreateEnum
CREATE TYPE "InstallmentPeriod" AS ENUM ('BULANAN', 'MINGGUAN');

-- AlterTable
ALTER TABLE "Loan" ADD COLUMN     "period" "InstallmentPeriod" NOT NULL DEFAULT 'BULANAN';

-- AlterTable
ALTER TABLE "LoanTerm" ADD COLUMN     "period" "InstallmentPeriod" NOT NULL DEFAULT 'BULANAN';
