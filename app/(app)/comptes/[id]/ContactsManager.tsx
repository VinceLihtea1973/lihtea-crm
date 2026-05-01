"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  createContactAction,
  updateContactAction,
  deleteContactAction,
} from "@/app/_actions/contacts";

type Contact = {
  id: string;
  firstName?: string | null;
  lastName: string;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  isPrimary: boolean;
  isExecutive: boolean;
};

const EMPTY_FORM = {
  firstName:   "",
  lastName:    "",
  jobTitle:    "",
  email:       "",
  phone:       "",
  linkedin:    "",
  isPrimary:   false,
  isExecutive: false,
};

// ─── Modal ajout / édition ────────────────────────────────────────

function ContactModal({
  companyId,
  initial,
  onClose,
  onSaved,
}: {
  companyId: string;
  initial?: Contact;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? {
          firstName:   initial.firstName ?? "",
          lastName:    initial.lastName,
          jobTitle:    initial.jobTitle ?? "",
          email:       initial.email ?? "",
          phone:       initial.phone ?? "",
          linkedin:    initial.linkedin ?? "",
          isPrimary:   initial.isPrimary,
          isExecutive: initial.isExecutive,
        }
      : { ...EMPTY_FORM }
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = initial
        ? await updateContactAction({ contactId: initial.id, ...form, email: form.email || null, phone: form.phone || null })
        : await createContactAction({ companyId, ...form, email: form.email || null, phone: form.phone || null });
      if (r.ok) { onSaved(); onClose(); }
      else setError((r as { ok: false; error: string }).error);
    });
  }

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="text-[15px] font-extrabold text-navy">
            {initial ? "Modifier le contact" : "Nouveau contact"}
          </div>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 text-[22px] leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field("firstName", "Prénom", "text", "Prénom")}
            {field("lastName",  "Nom *",  "text", "Nom de famille")}
          </div>
          {field("jobTitle", "Poste",  "text", "Directeur Commercial…")}
          {field("email",    "Email",  "email", "prenom@entreprise.fr")}
          {field("phone",    "Téléphone", "tel", "+33 6 00 00 00 00")}
          {field("linkedin", "LinkedIn URL", "url", "https://linkedin.com/in/…")}

          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-[13px] text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
                className="accent-teal"
              />
              Contact principal
            </label>
            <label className="flex items-center gap-2 text-[13px] text-text-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isExecutive}
                onChange={(e) => setForm((f) => ({ ...f, isExecutive: e.target.checked }))}
                className="accent-teal"
              />
              Dirigeant
            </label>
          </div>

          {error && <p className="text-[12px] text-lh-red bg-lh-red-bg px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={pending || !form.lastName.trim()}>
              {pending ? "Sauvegarde…" : initial ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────

export function ContactsManager({
  contacts,
  companyId,
}: {
  contacts: Contact[];
  companyId: string;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState<Contact | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [pending, start]          = useTransition();

  function handleSaved() { router.refresh(); }

  function handleDelete(contactId: string) {
    if (!confirm("Supprimer ce contact ?")) return;
    setDeleting(contactId);
    start(async () => {
      await deleteContactAction(contactId);
      router.refresh();
      setDeleting(null);
    });
  }

  return (
    <div className="max-w-3xl">
      {/* Liste */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 text-text-3">
          <div className="text-4xl mb-3">👥</div>
          <div className="text-[14px] font-semibold text-text-2 mb-1">Aucun contact</div>
          <div className="text-[12px] mb-4">Ajoutez le premier contact de ce compte.</div>
          <Button onClick={() => setShowAdd(true)}>＋ Ajouter un contact</Button>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg">
            <span className="text-[12px] text-text-3 font-semibold">
              {contacts.length} contact{contacts.length > 1 ? "s" : ""}
            </span>
            <Button onClick={() => setShowAdd(true)}>＋ Ajouter</Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
                <th className="text-left px-4 py-3 min-w-[200px]">Contact</th>
                <th className="text-left px-4 py-3">Poste</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Tél.</th>
                <th className="text-right px-4 py-3 w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
                return (
                  <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-bg/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName || "?"} seed={c.id} size={28} />
                        <div>
                          <div className="text-[13px] font-semibold text-text-1 flex items-center gap-1.5">
                            {fullName}
                            {c.isPrimary && (
                              <span className="text-[9px] bg-teal/10 text-teal border border-teal/20 px-1.5 py-px rounded-full font-bold uppercase tracking-wide">
                                Principal
                              </span>
                            )}
                            {c.isExecutive && (
                              <span className="text-[9px] bg-navy/10 text-navy border border-navy/20 px-1.5 py-px rounded-full font-bold uppercase tracking-wide">
                                Dirigeant
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-2">{c.jobTitle ?? "—"}</td>
                    <td className="px-4 py-3 text-[12px] text-text-2">
                      {c.email
                        ? <a href={`mailto:${c.email}`} className="hover:text-navy hover:underline">{c.email}</a>
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-2 font-mono">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditing(c)}
                          className="px-2 py-1 rounded-lg border border-border text-[11px] font-semibold text-text-2 hover:bg-bg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id || pending}
                          className="px-2 py-1 rounded-lg border border-lh-red/20 text-[11px] font-semibold text-lh-red hover:bg-lh-red-bg transition-colors disabled:opacity-40"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
      )}

      {/* Modals */}
      {showAdd && (
        <ContactModal
          companyId={companyId}
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}
      {editing && (
        <ContactModal
          companyId={companyId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
