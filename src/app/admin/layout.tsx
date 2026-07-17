"use client";

import { ToastProvider } from "@/components/admin/admin-toast";

/**
 * Shared admin layout — provides the Toast notification system
 * to every /admin/* page without individual wrappers.
 *
 * The dashboard page (`/admin/page.tsx`) still uses its own
 * <ToastProvider> internally because it also renders the
 * <ActivityFeed> which needs the toast context. This layout
 * ensures sub-pages like /admin/social-images, /admin/revenue,
 * etc. also have access to useToast().
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}