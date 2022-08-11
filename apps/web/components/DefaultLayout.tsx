import Head from 'next/head';
// import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { ReactQueryDevtools } from 'react-query/devtools';
import { MenuIcon } from '@heroicons/react/solid';
type DefaultLayoutProps = { children: ReactNode };

export const DefaultLayout = ({ children }: DefaultLayoutProps) => {
  // On page load or when changing themes, best to add inline in `head` to avoid FOUC
  if (global.window) {
    // if (window.localStorage.theme === 'dark' || (!('theme' in window.localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    //   window.document.documentElement.classList.add('dark')
    // } else {
    //   window.document.documentElement.classList.remove('dark')
    // }

    // Whenever the user explicitly chooses light mode
    // window.localStorage.theme = 'light'

    // Whenever the user explicitly chooses dark mode
    // window.localStorage.theme = 'dark'

    // Whenever the user explicitly chooses to respect the OS preference
    // window.localStorage.removeItem('theme')
  }
  return (
    <>
      <Head>
        <title>Scrap</title>
      </Head>

      <main className='h-screen bg-secondary text-primary border-primary'>
        <div className='border-2 border-primary h-full overflow-y-scroll'>
          <div className='w-full h-14 border-b-2 flex justify-between items-center'>
            <span className='text-2xl font-bold text-amber ml-5'>Scrap</span>
            <div className='border-l-2 h-full flex w-14 justify-center'>
              <MenuIcon className='self-center h-8 w-10' />
            </div>
          </div>
          {/* <div className='fixed bg-red-500 w-full left-0 z-10'>
            <div>
              hello
            </div>
            <div>
              hello
            </div>
            <div>
              hello
            </div>
          </div> */}
          {children}
        </div>
      </main>

      {process.env.NODE_ENV !== 'production' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </>
  );
};
