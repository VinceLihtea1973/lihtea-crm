import { PlaceholderPage } from "@/components/ui/PlaceholderPage";

export const metadata = { title: "Simulateur" };

export default function SimulateurPage() {
  return (
    <PlaceholderPage
      title="Simulateur"
      subtitle="Pont vers le Simulateur Lihtea existant"
      phase="Phase 5"
      description="Intégration du Simulateur déjà déployé : ouverture pré-remplie avec le SIREN et la raison sociale du client actif, récupération des résultats dans la fiche et le deal en cours."
    />
  );
}
