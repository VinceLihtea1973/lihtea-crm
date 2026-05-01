"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";
import { moveDealStageAction, closeDealLostAction } from "@/app/_actions/deals";

type Stage =
  | "QUALIFICATION"
  | "DEMO"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

type Deal = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  probability: number;
  stage: Stage;
  expectedCloseAt?: string | null;  // ISO string serialized from server
  company: { id: string; name: string };
  primaryContact?: { firstName?: string | null; lastName: string } | null;
  owner?: { name?: string | null } | null;
};

type Column = {
  stage: Stage;
  label: string;
  color: "navy" | "blue" | "purple" | "amber" | "green" | "red";
};

const COLUMNS: Column[] = [
  { stage: "QUALIFICATION", label: "Qualification", color: "navy" },
  { stage: "DEMO",          label: "Démo",          color: "blue" },
  { stage: "PROPOSAL",      label: "Proposition",   color: "purple" },
  { stage: "NEGOTIATION",   label: "Négociation",   color: "amber" },
  { stage: "WON",           label: "Gagné",         color: "green" },
  { stage: "LOST",          label: "Perdu",         color: "red" },
];

const CHIP_COLORS: Record<Stage, "navy" | "blue" | "purple" | "amber" | "green" | "red"> = {
  QUALIFICATION: "navy",
  DEMO:          "blue",
  PROPOSAL:      "purple",
  NEGOTIATION:   "amber",
  WON:           "green",
  LOST:          "red",
};

export function KanbanBoard({ initialDeals }: { initialDeals: Deal[] }) {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [isPending, startTransition] = useTransition();
  const [lostModal, setLostModal] = useState<{
    dealId: string;
    dealName: string;
  } | null>(null);

  // Drag state
  const dragDealId = useRef<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

  function onDragStart(dealId: string) {
    dragDealId.current = dealId;
  }

  function onDragOver(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    setDragOverStage(stage);
  }

  function onDragLeave() {
    setDragOverStage(null);
  }

  function onDrop(e: React.DragEvent, targetStage: Stage) {
    e.preventDefault();
    setDragOverStage(null);

    const id = dragDealId.current;
    if (!id) return;

    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === targetStage) return;

    if (targetStage === "LOST") {
      setLostModal({ dealId: id, dealName: deal.name });
      return;
    }

    // Optimistic update
    const DEFAULT_PROBA: Record<Stage, number> = {
      QUALIFICATION: 20,
      DEMO:          40,
      PROPOSAL:      60,
      NEGOTIATION:   80,
      WON:           100,
      LOST:          0,
    };
    setDeals((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, stage: targetStage, probability: DEFAULT_PROBA[targetStage] }
          : d
      )
    );

    startTransition(async () => {
      const result = await moveDealStageAction({ dealId: id, stage: targetStage });
      if (!result.ok) {
        // Revert
        setDeals((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, stage: deal.stage, probability: deal.probability } : d
          )
        );
      }
      router.refresh();
    });
  }

  function handleLostConfirm(reason: string) {
    if (!lostModal) return;
    const { dealId } = lostModal;
    const deal = deals.find((d) => d.id === dealId);
    setLostModal(null);
    if (!deal) return;

    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId ? { ...d, stage: "LOST", probability: 0 } : d
      )
    );

    startTransition(async () => {
      await closeDealLostAction({ dealId, reason });
      router.refresh();
    });
  }

  const dealsByStage = (stage: Stage) => deals.filter((d) => d.stage === stage);

  const totalOpenAmount = deals
    .filter((d) => d.stage !== "WON" && d.stage !== "LOST")
    .reduce((s, d) => s + d.amount * (d.probability / 100), 0);

  return (
    <>
      {/* Weighted pipeline summary */}
      <div className="px-6 py-3 border-b border-border bg-surface flex items-center gap-6 text-[12px] text-text-3">
        <span>
          Pipeline pondéré :{" "}
          <strong className="text-navy text-[13px]">
            {totalOpenAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
          </strong>
        </span>
        <span>
          {deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST").length} deals ouverts
        </span>
        <span className="text-lh-green font-semibold">
          {deals.filter((d) => d.stage === "WON").length} gagnés
        </span>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-3 p-4 min-w-max">
          {COLUMNS.map((col) => {
            const colDeals  = dealsByStage(col.stage);
            const colAmount = colDeals.reduce((s, d) => s + d.amount, 0);
            const isOver    = dragOverStage === col.stage;

            return (
              <div
                key={col.stage}
                className="flex flex-col w-64 shrink-0"
                onDragOver={(e) => onDragOver(e, col.stage)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, col.stage)}
              >
                {/* Column header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Chip color={col.color}>{col.label}</Chip>
                    <span className="text-[11px] text-text-3 font-mono">
                      {colDeals.length}
                    </span>
                  </div>
                  {colAmount > 0 && (
                    <span className="text-[11px] text-text-3 font-mono">
                      {colAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
                    </span>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  className={[
                    "flex-1 rounded-xl border-2 border-dashed transition-colors p-1.5 space-y-2 overflow-y-auto",
                    isOver
                      ? "border-teal bg-teal/5"
                      : "border-border bg-bg/40",
                  ].join(" ")}
                >
                  {colDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onDragStart={onDragStart}
                    />
                  ))}
                  {colDeals.length === 0 && (
                    <div className="h-16 flex items-center justify-center text-[11px] text-text-3/50">
                      Déposer ici
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lost reason modal */}
      {lostModal && (
        <LostModal
          dealName={lostModal.dealName}
          onConfirm={handleLostConfirm}
          onCancel={() => setLostModal(null)}
        />
      )}
    </>
  );
}

// ─── Deal Card ───────────────────────────────────────────────────────────────

function DealCard({
  deal,
  onDragStart,
}: {
  deal: Deal;
  onDragStart: (id: string) => void;
}) {
  const isLate =
    deal.expectedCloseAt && new Date(deal.expectedCloseAt) < new Date();

  return (
    <div
      draggable
      onDragStart={() => onDragStart(deal.id)}
      className="bg-surface rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow select-none"
    >
      {/* Company + amount */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={deal.company.name} seed={deal.company.id} size={20} />
          <span className="text-[11px] text-text-3 truncate">{deal.company.name}</span>
        </div>
        <span className="text-[12px] font-mono font-semibold text-navy shrink-0">
          {deal.amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
        </span>
      </div>

      {/* Deal name */}
      <div className="text-[13px] font-semibold text-text-1 mb-2 leading-snug">
        {deal.name}
      </div>

      {/* Footer: contact + close date + proba */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-text-3">
        <span className="truncate">
          {deal.primaryContact
            ? [deal.primaryContact.firstName, deal.primaryContact.lastName]
                .filter(Boolean)
                .join(" ")
            : deal.owner?.name ?? "—"}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {deal.expectedCloseAt && (
            <span className={isLate ? "text-lh-red font-semibold" : ""}>
              {new Date(deal.expectedCloseAt).toLocaleDateString("fr-FR", {
                day:   "2-digit",
                month: "short",
              })}
            </span>
          )}
          <span className="bg-bg border border-border rounded px-1 font-mono">
            {deal.probability}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Lost reason modal ───────────────────────────────────────────────────────

function LostModal({
  dealName,
  onConfirm,
  onCancel,
}: {
  dealName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 py-4 border-b border-border">
          <div className="text-[15px] font-extrabold text-navy">Clôturer en Perdu</div>
          <div className="text-[12px] text-text-3 mt-0.5 truncate">{dealName}</div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">
              Raison de la perte (optionnel)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Prix, timing, concurrent…"
              maxLength={280}
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-[13px] text-text-2 hover:text-text-1 font-semibold rounded-lg border border-border hover:bg-bg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(reason)}
              className="px-4 py-2 text-[13px] text-white bg-lh-red hover:opacity-90 font-semibold rounded-lg transition-opacity"
            >
              Confirmer la perte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
