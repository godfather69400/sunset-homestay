import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminSession())) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-24">
      <AdminDashboard />
    </main>
  );
}
