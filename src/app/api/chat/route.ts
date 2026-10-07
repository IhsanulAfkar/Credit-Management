import { tool, streamText, generateText, stepCountIs, convertToModelMessages, toUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma'; // Your Prisma client path

import { createOllama } from 'ollama-ai-provider-v2';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { AffectedModel } from '@/types/chat';
import { getSession } from '@/lib/auth';
import { createGetBorrowersTools, createGetInstallmentsTools, createGetLoansTools, createGetLoanTermsTools, createGetPaymentsTools, getCurrentDate, ToolsResult } from '@/lib/chat/tools';

const ollama = createOllama({
  // optional settings, e.g.
  baseURL: process.env.OLLAMA_URL || 'http://localhost:11434/api',
});
export const GET = withAuth(async (req, auth) => {
  try {
    const userId = auth.user.id

    const histories = await prisma.chatHistory.findMany({
      where: {
        user_id: userId,
      },
      include: {
        chatExecutionHistories: {
          include: {
            chatExecutionHistoryItems: {
              include: {
                borrower: true,
                loan: true,
                loanTerm: true,
                installment: true,
                payment: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 20,
    })

    const formatted = histories
      .slice()
      .reverse()
      .map((history) => ({
        ...history,
        chatExecutionHistories: history.chatExecutionHistories.map((exec) => ({
          ...exec,
          chatExecutionHistoryItems:
            exec.chatExecutionHistoryItems.map((item) => ({
              ...item,
              borrower: item.borrower ?? null,
              loan: item.loan ?? null,
              loanTerm: item.loanTerm ?? null,
              installment: item.installment ?? null,
              payment: item.payment ?? null,
            })),
        })),
      }))

    return NextResponse.json({
      message: 'Success',
      data: formatted,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { message: 'Server Error' },
      { status: 500 }
    )
  }
})
export const DELETE = withAuth(async (req, auth) => {
  try {
    const userId = auth.user.id
    await prisma.chatHistory.deleteMany({
      where: {
        user_id: userId
      }
    })
    return NextResponse.json({ message: "success" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server Error" }, { status: 500 })
  }
})
export async function POST(req: Request) {
  try {
    const { text: prompt, messages } = await req.json();
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id
    // 1. Save the User's Message immediately
    await prisma.chatHistory.create({
      data: {
        user_id: userId,
        role: 'user',
        content: prompt,
      },
    });
    let aiChatId: string | null = null
    const toolsResults: ToolsResult[] = []
    const result = streamText({
      model: ollama(process.env.OLLAMA_MODEL!),
      providerOptions: {
        ollama: {
          think: true
        }
      },
      system: `
You are an Credit Management Assistant.

Always respond in Bahasa Indonesia.

You have access to tools for retrieving database information.

IMPORTANT:
When a tool can answer the user's question, ALWAYS call the tool.
Do not answer from your own knowledge.
Do not only think about how to call the tool. ACTUALLY CALL IT.

Tool selection:
- Pengumuman → getAnnouncements
- Peminjam → getBorrowers
- Tenor → getLoanTerms
- Pinjaman → getLoans
- Cicilan → getInstallments
- Pembayaran → getPayments

Before calling a tool, determine whether the user's request can be mapped to the tool filters with certainty.

NEVER GUESS A FILTER.

If you are not certain which filter value to use, STOP and ask the user for clarification.

You MUST ask for clarification if ANY of these are unclear:

which filter should be used
which status should be selected
which date range should be used
which person is being referred to
which loan is being referred to
which period is being referred to
how the user's wording maps to a tool filter
what value a vague word represents

Do NOT call the tool with a guessed filter.

Do NOT choose the most likely filter.

Do NOT assume what the user means.

Do NOT convert vague wording into a specific filter unless the meaning is explicitly clear.
`,
      messages: await convertToModelMessages(messages.slice(-20)),
      tools: {
        getCurrentDate,
        getBorrowersTools: createGetBorrowersTools(toolsResults),
        getLoanTermsTools: createGetLoanTermsTools(toolsResults),
        getLoansTools: createGetLoansTools(toolsResults),
        getInstallmentsTools: createGetInstallmentsTools(toolsResults),
        getPaymentsTools: createGetPaymentsTools(toolsResults),
      },
      stopWhen: stepCountIs(7),
      onFinish: async (props) => {
        const { text, content: propsContent } = props
        const reasoning = propsContent
          .filter((message) => message.type === 'reasoning')
          .map((message) => message.text)
          .join('');

        const chat = await prisma.chatHistory.create({
          data: {
            user_id: userId,
            role: 'assistant',
            content: text,
            reasoning
          },
        });
        aiChatId = chat.id
        if (aiChatId) {
          for (const toolsResult of toolsResults) {
            // save instruction
            const chatExec = await prisma.chatExecutionHistory.create({
              data: {
                chat_id: aiChatId,
                method: toolsResult.method,
                payload: toolsResult.payload,
              }
            })
            const modelFieldMap = {
              borrower: 'borrowerId',
              loan: 'loanId',
              loan_term: 'loanTermId',
              installment: 'installmentId',
              payment: 'paymentId',
            } as const

            const historyItems = toolsResult.model_affected.flatMap((affected) => {
              const field =
                modelFieldMap[affected.model as keyof typeof modelFieldMap]

              if (!field || !affected.id?.length) {
                return []
              }

              return affected.id.map((id) => ({
                chatExecutionHistoryId: chatExec.id,
                [field]: id,
              }))
            })

            if (historyItems.length > 0) {
              await prisma.chatExecutionHistoryItem.createMany({
                data: historyItems,
              })
            }
          }
        }
      }
    });
    const uiStream = toUIMessageStream({
      stream: result.stream,
    });

    return createUIMessageStreamResponse({
      stream: uiStream
    });
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server Error" }, { status: 500 })
  }
}