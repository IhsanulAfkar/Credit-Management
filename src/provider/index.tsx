'use client';
import { NextPage } from 'next';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import QueryProvider from './QueryProvider';
import dynamic from 'next/dynamic';

interface Props {
  children: ReactNode;
}

const Providers: NextPage<Props> = ({ children }) => {
  return (
    <>
      <Toaster richColors position="top-right" expand />

      <QueryProvider>
        {children}
      </QueryProvider>
    </>
  );
};

export default Providers;
