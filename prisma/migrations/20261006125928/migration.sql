-- CreateTable
CREATE TABLE "ChatHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reasoning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatExecutionHistory" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatExecutionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatExecutionHistoryItem" (
    "id" TEXT NOT NULL,
    "chatExecutionHistoryId" TEXT,
    "borrowerId" TEXT,
    "loanId" TEXT,
    "loanTermId" TEXT,
    "installmentId" TEXT,
    "paymentId" TEXT,

    CONSTRAINT "ChatExecutionHistoryItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatHistory" ADD CONSTRAINT "ChatHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatExecutionHistory" ADD CONSTRAINT "ChatExecutionHistory_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ChatHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatExecutionHistoryItem" ADD CONSTRAINT "ChatExecutionHistoryItem_chatExecutionHistoryId_fkey" FOREIGN KEY ("chatExecutionHistoryId") REFERENCES "ChatExecutionHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatExecutionHistoryItem" ADD CONSTRAINT "ChatExecutionHistoryItem_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatExecutionHistoryItem" ADD CONSTRAINT "ChatExecutionHistoryItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatExecutionHistoryItem" ADD CONSTRAINT "ChatExecutionHistoryItem_loanTermId_fkey" FOREIGN KEY ("loanTermId") REFERENCES "LoanTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatExecutionHistoryItem" ADD CONSTRAINT "ChatExecutionHistoryItem_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatExecutionHistoryItem" ADD CONSTRAINT "ChatExecutionHistoryItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
