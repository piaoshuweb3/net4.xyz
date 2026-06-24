'use client';

import AdminLayout from '@/components/Admin/AdminLayout';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
