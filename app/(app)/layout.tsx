import { Sidebar } from "@/components/layout/Sidebar";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await requireTenant();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const displayName = user?.name ?? user?.email ?? "Utilisateur";

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar userName={displayName} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
