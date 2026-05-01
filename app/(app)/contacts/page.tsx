import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export const metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const { tenantId } = await requireTenant();

  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
    include: {
      company: { select: { id: true, name: true, status: true } },
    },
  });

  const exec = contacts.filter((c) => c.isPrimary).length;
  const sec = contacts.length - exec;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Contacts"
        subtitle="Annuaire des décideurs"
        breadcrumbs={[{ label: "Ventes" }, { label: "Contacts" }]}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Chip color="navy">{contacts.length} contacts</Chip>
          <Chip color="teal">{exec} principaux</Chip>
          <Chip color="gold">{sec} secondaires</Chip>
        </div>

        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
                <th className="text-left px-3 py-3 min-w-[240px]">Nom</th>
                <th className="text-left px-3 py-3">Poste</th>
                <th className="text-left px-3 py-3">Compte</th>
                <th className="text-left px-3 py-3">Email</th>
                <th className="text-left px-3 py-3">Tags</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const fullName = `${c.firstName ?? ""} ${c.lastName}`.trim();
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-b-0 hover:bg-bg/50 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName} seed={c.id} size={32} />
                        <Link href={`/contacts/${c.id}`} className="text-[13px] font-semibold text-navy hover:underline">
                          {fullName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-text-2">
                      {c.jobTitle ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-[12px] font-semibold">
                      {c.company ? (
                        <Link href={`/comptes/${c.company.id}`} className="text-navy hover:underline">
                          {c.company.name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-[12px] text-text-2 font-mono">
                      {c.email ?? "—"}
                    </td>
                    <td className="px-3 py-3 flex gap-1 flex-wrap">
                      {c.isPrimary && <Chip color="teal">Principal</Chip>}
                      {c.isExecutive && <Chip color="gold">Dirigeant</Chip>}
                      {c.optOut && <Chip color="red">Opt-out</Chip>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
