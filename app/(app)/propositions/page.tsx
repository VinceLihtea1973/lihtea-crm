import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata = { title: "Propositions" };

export default function PropositionsPage() {
  return (
    <PlaceholderPage
      title="Propositions"
      subtitle="Génération PDF depuis templates"
      phase="Phase 5"
      description="Éditeur de templates avec variables ({client}, {economies}, {date}…), génération PDF serveur, envoi tracké, statut brouillon / envoyée / vue / acceptée / refusée. Signature électronique optionnelle."
    />
  );
}
