import { Header } from "@/components/layout/Header";
import { Chip } from "./Chip";

/**
 * Placeholder utilisé pour les modules pas encore construits en Phase 1.
 * Remplacé module par module dans les phases suivantes.
 */
export function PlaceholderPage({
  title,
  subtitle,
  phase,
  description,
}: {
  title: string;
  subtitle: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title={title} subtitle={subtitle} />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <Chip color="gold">{phase}</Chip>
          <h1 className="mt-6 text-[28px] font-extrabold text-navy tracking-[-0.02em]">
            {title}
          </h1>
          <p className="mt-3 text-text-2 leading-relaxed">{description}</p>
          <p className="mt-8 text-[12px] text-text-3">
            Module en cours de construction — cadre et navigation en place,
            données à brancher dans la phase indiquée.
          </p>
        </div>
      </div>
    </div>
  );
}
