import type { BorrowerStatus, InstallmentPeriod, InstallmentStatus, LoanStatus } from "@/generated/prisma/enums";
import {
  BORROWER_STATUS_LABEL,
  BORROWER_STATUS_STYLE,
  INSTALLMENT_PERIOD_LABEL,
  INSTALLMENT_PERIOD_STYLE,
  INSTALLMENT_STATUS_LABEL,
  INSTALLMENT_STATUS_STYLE,
  LOAN_STATUS_LABEL,
  LOAN_STATUS_STYLE,
} from "@/lib/status";
import { Badge } from "./ui/Badge";

export function BorrowerStatusBadge({ status }: { status: BorrowerStatus }) {
  return (
    <Badge className={BORROWER_STATUS_STYLE[status]}>
      {BORROWER_STATUS_LABEL[status]}
    </Badge>
  );
}

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return (
    <Badge className={LOAN_STATUS_STYLE[status]}>
      {LOAN_STATUS_LABEL[status]}
    </Badge>
  );
}

export function InstallmentStatusBadge({
  status,
}: {
  status: InstallmentStatus;
}) {
  return (
    <Badge className={INSTALLMENT_STATUS_STYLE[status]}>
      {INSTALLMENT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function InstallmentPeriodBadge({ period }: { period: InstallmentPeriod }) {
  return (
    <Badge className={INSTALLMENT_PERIOD_STYLE[period]}>
      {INSTALLMENT_PERIOD_LABEL[period]}
    </Badge>
  );
}