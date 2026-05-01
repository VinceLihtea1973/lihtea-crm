import { Header } from "@/components/layout/Header";
import { SearchForm } from "./SearchForm";

export const metadata = { title: "Prospection" };

export default async function ProspectionPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Prospection"
        subtitle="Recherche INSEE Sirene + score ICP"
        breadcrumbs={[
          { label: "Acquisition" },
          { label: "Prospection" },
        ]}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-[24px] font-extrabold text-navy tracking-[-0.02em]">
            Recherche d&apos;entreprises
          </h1>
          <p className="mt-1 text-[13px] text-text-2">
            Tape une raison sociale ou affine par filtres — chaque résultat est
            scoré ICP automatiquement et peut être importé en un clic.
          </p>
        </div>

        <SearchForm />
      </div>
    </div>
  );
}
