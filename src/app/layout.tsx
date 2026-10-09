import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Job Scraper', description: 'Discover open roles from company careers pages.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
