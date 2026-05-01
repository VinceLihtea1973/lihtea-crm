import { Header } from "@/components/layout/Header";
import { NewListForm } from "./NewListForm";

export const metadata = { title: "Nouvelle liste" };

export default function NewListPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Nouvelle liste"
        subtitle="Créer une recherche sauvegardée"
        breadcrumbs={[
          { label: "Acquisition" },
          { label: "Listes ICP", href: "/listes" },
          { label: "Nouvelle liste" },
        ]}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <NewListForm />
        </div>
      </div>
    </div>
  );
}
