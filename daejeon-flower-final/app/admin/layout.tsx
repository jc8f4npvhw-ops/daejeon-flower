import type { ReactNode } from 'react';
export const metadata = {
  manifest: '/admin-order-push.webmanifest',
  appleWebApp: {capable: true, title: '대전꽃백화점 관리자'},
  icons: {apple: '/admin-order-push-192.png'},
  robots: {index:false,follow:false},
};
export default function AdminLayout({children}:{children:ReactNode}) { return children; }
