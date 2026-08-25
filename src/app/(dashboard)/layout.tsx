import { auth } from '@/lib/auth';
import { NextPage } from 'next'
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const Layout = async ({ children }: Props) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect('/login')
  return <>{children}</>
}

export default Layout