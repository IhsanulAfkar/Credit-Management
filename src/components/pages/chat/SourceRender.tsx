import { TChatExecutionHistory } from '@/types/chat'
import { NextPage } from 'next'
import {
  ChevronRight,
  Search,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Props {
  executionHistories: TChatExecutionHistory
}

type SourceType =
  | 'installment'
  | 'loan'
  | 'loanTerm'
  | 'borrower'
  | 'payment'

const sourceTypes: SourceType[] = [
  'installment'
  , 'loan'
  , 'loanTerm'
  , 'borrower'
  , 'payment'
]

const sourceLabels: Record<SourceType, string> = {
  borrower: "Borrower",
  installment: "Installment",
  loan: "Loan",
  loanTerm: "Loan Term",
  payment: 'Payments',
}

const SourceRender: NextPage<Props> = ({
  executionHistories,
}) => {
  const groupedSources = sourceTypes.reduce(
    (acc, type) => {
      const data = executionHistories.chatExecutionHistoryItems
        .map((item) => item[type])
        .filter(Boolean)

      if (data.length > 0) {
        acc[type] = data
      }

      return acc
    },
    {} as Partial<Record<SourceType, any[]>>
  )

  const totalResults = Object.values(groupedSources).reduce(
    (total, items) => total + (items?.length ?? 0),
    0
  )

  const formatColumnName = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (char) => char.toUpperCase())
  }

  const formatValue = (key: string, value: unknown) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '-'
    }

    if (
      key.toLowerCase().includes('tanggal') ||
      key.toLowerCase().includes('date')
    ) {
      const date = new Date(String(value))

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      }
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  }
  console.log(executionHistories)
  return (
    <Collapsible className="w-full max-w-md">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-md py-1 text-left text-[10px] text-gray-500 hover:text-foreground">
        <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90" />

        <Search className="size-3 flex-none" />

        <span className="font-medium text-foreground">
          {executionHistories.method}
        </span>

        <span className="ml-auto shrink-0">
          {totalResults} result
          {totalResults !== 1 ? 's' : ''}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1 pl-5">
        <div className="space-y-3">
          {Object.entries(groupedSources).map(
            ([type, items]) => {
              if (!items?.length) return null

              const columns = Object.keys(items[0]).filter(
                (key) =>
                  ![
                    'createdAt',
                    'updatedAt',
                    'id',
                  ].includes(key) &&
                  !key.endsWith('Id')
              )

              return (
                <div key={type} className="min-w-0">
                  <div className="mb-1 text-[10px] font-medium text-foreground">
                    {sourceLabels[type as SourceType]}{' '}
                    <span className="font-normal text-muted-foreground">
                      ({items.length})
                    </span>
                  </div>

                  <div className="max-h-60 max-w-full overflow-auto">
                    <table className="w-max min-w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-gray-300 text-left text-muted-foreground">
                          {columns.map((column) => (
                            <th
                              key={column}
                              className="whitespace-nowrap py-1.5 pr-4 font-medium"
                            >
                              {formatColumnName(column)}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {items.map((item, index) => (
                          <tr
                            key={item.id ?? index}
                            className="border-b border-gray-300 last:border-0"
                          >
                            {columns.map((column) => (
                              <td
                                key={column}
                                className="max-w-[180px] truncate whitespace-nowrap py-1.5 pr-4 text-muted-foreground"
                              >
                                {formatValue(
                                  column,
                                  item[column]
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default SourceRender