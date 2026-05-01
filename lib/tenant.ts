import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Garde-fou multi-tenant — toute requête métier doit passer par là
 * pour récupérer le tenantId courant. Empêche d'oublier le filtre.
 */
export async function requireTenant() {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) {
    redirect("/signin");
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    role: session.user.role,
  };
}

/**
 * Wrapper générique : exécute une requête Prisma en forçant le filtre tenantId.
 * Pratique pour les findMany simples.
 */
export async function tenantScoped<T>(
  fn: (ctx: { tenantId: string; userId: string }) => Promise<T>
): Promise<T> {
  const { tenantId, userId } = await requireTenant();
  return fn({ tenantId, userId });
}

/**
 * Helper typé — accès direct à un Company du tenant courant.
 * Exemple d'utilisation côté server component :
 *   const c = await getTenantCompany(id);
 */
export async function getTenantCompany(id: string) {
  const { tenantId } = await requireTenant();
  return prisma.company.findFirst({
    where: { id, tenantId },
  });
}
