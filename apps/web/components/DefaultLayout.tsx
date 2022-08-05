import Head from 'next/head';
// import Link from 'next/link';
import { ReactNode } from 'react';
import { ReactQueryDevtools } from 'react-query/devtools';
type DefaultLayoutProps = { children: ReactNode };

export const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  return (
    <>
      <Head>
        <title>Scrap</title>
      </Head>

      <main className='p-0.5 h-screen'>
        <div className='border-2 border-black h-full overflow-y-scroll'>
          <div className='w-full h-14 border-b-2 border-black'>
            <span>Scrap</span>
            <div></div>
          </div>
          {children}
        </div>
      </main>

      {process.env.NODE_ENV !== 'production' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </>
  );
};
