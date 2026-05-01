"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { refreshListAction, deleteListAction } from "@/app/_actions/lists";

export function ListActions({
  listId,
  type,
}: {
  listId: string;
  type: "DYNAMIC" | "STATIC";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const r = await refreshListAction(listId);
      if (!r.ok) alert(r.error);
      else       router.refresh();
    });
  }

  function remove() {
    if (!confirm("Supprimer définitivement cette liste ?")) return;
    startTransition(async () => {
      const r = await deleteListAction(listId);
      if (!r.ok) alert(r.error);
      else       router.push("/listes");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {type === "DYNAMIC" && (
        <Button
          type="button"
          variant="toolbar"
          onClick={refresh}
          disabled={pending}
        >
          {pending ? "Rafraîchissement…" : "↻ Rafraîchir"}
        </Button>
      )}
      <Button
        type="button"
        variant="toolbar"
        onClick={remove}
        disabled={pending}
        className="text-lh-red"
      >
        Supprimer
      </Button>
    </div>
  );
}
