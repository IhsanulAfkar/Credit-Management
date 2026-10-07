import { Borrower, Installment, Loan, LoanTerm, Payment } from "@/generated/prisma/browser"

export type AffectedModel = "borrower" | "loan_term" | "loan" | "installment" | "payment"

export type TChatExecutionHistory = {
  "id": string,
  "chat_id": string,
  "method": string,
  "payload"?: any,
  "created_at": string,
  "chatExecutionHistoryItems": TChatExecutionHistoryItem[]
}
export type TChatExecutionHistoryItem = {
  "id": string,
  "chatExecutionHistoryId": string,
  "borrower": Borrower | null,
  "loan": Loan | null,
  "loanTerm": LoanTerm | null,
  "installment": Installment | null,
  "payment": Payment | null,
}