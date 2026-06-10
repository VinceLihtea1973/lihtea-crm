import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { ComptesClient } from "./ComptesClient";

export const metadata = { title: "Comptes" };
export const dynamic = "force-dynamic";

export default async function ComptesPage() {
  const { tenantId } = await requireTenant();

  const companies = await prisma.company.findMany({
    where: { tenantId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { contacts: true, deals: true } } },
  });

  const serialized = companies.map((c) => ({
    id:            c.id,
    name:          c.name,
    siren:         c.siren,
    siret:         c.siret,
    legalForm:     c.legalForm,
    legalFormCode: c.legalFormCode,
    apeCode:       c.apeCode,
    headcountBand: c.headcountBand,
    status:        c.status as "PROSPECT" | "LEAD" | "CLIENT" | "LOST",
    region:        c.region,
    department:    c.department,
    city:          c.city,
    postalCode:    c.postalCode,
    address:       c.address,
    icp:           c.icp ?? 0,
    contacts:      c._count.contacts,
    deals:         c._count.deals,
    creationDate:  c.creationDate ? c.creationDate.toISOString().slice(0,10) : null,
    enrichedAt:    c.enrichedAt   ? c.enrichedAt.toISOString().slice(0,10)   : null,
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Comptes"
        subtitle="Toutes les entreprises du portefeuille"
        breadcrumbs={[{ label: "Ventes" }, { label: "Comptes" }]}
      />
      <ComptesClient companies={serialized} />
    </div>
  );
}
