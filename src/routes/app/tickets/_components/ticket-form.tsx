import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { TicketDetailDto } from "@convex/support_tickets/dto/ticketDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TICKET_CATEGORY_LABEL } from "./ticket-category-badge";
import { TICKET_PRIORITY_LABEL } from "./ticket-priority-badge";

type Category = TicketDetailDto["category"];
type Priority = TicketDetailDto["priority"];

const CATEGORIES: Category[] = [
  "machine_panne",
  "produit_defaut",
  "facturation",
];
const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];

type DocumentType = "none" | "delivery_form" | "invoice" | "product";

type ClientPick = { id: Id<"clients">; code: string; name: string };

function ClientAutocomplete({
  selected,
  onPick,
  autoFocus,
}: {
  selected: ClientPick | null;
  onPick: (client: ClientPick) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const results = useQuery(
    api.clients.queries.listCatalog,
    selected === null && query.trim().length >= 2
      ? { query, limit: 8 }
      : "skip",
  );

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="ticket-client-input" className="text-xs">
        Client
      </Label>
      <div className="relative">
        <Input
          id="ticket-client-input"
          autoFocus={autoFocus}
          value={selected ? `${selected.code} — ${selected.name}` : query}
          readOnly={selected !== null}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tapez 2 lettres puis sélection"
          data-testid="ticket-form-client"
          className="h-8 font-mono text-[13px]"
        />
        {selected === null && results && results.length > 0 ? (
          <ul
            className="bg-popover ring-foreground/10 absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-md font-mono text-[12px] shadow-md ring-1"
            data-testid="ticket-form-client-suggestions"
          >
            {results.slice(0, 8).map((client) => (
              <li
                key={String(client.id)}
                className="hover:bg-muted cursor-pointer px-3 py-1.5"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onPick({
                    id: client.id as Id<"clients">,
                    code: client.code,
                    name: client.name,
                  });
                }}
              >
                {client.code} — {client.name}
                {client.city ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {client.city}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {selected !== null ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground absolute top-1 right-1 h-6 px-2 text-[11px]"
            onClick={() => {
              setQuery("");
              onPick({
                id: "" as unknown as Id<"clients">,
                code: "",
                name: "",
              });
            }}
            data-testid="ticket-form-client-clear"
          >
            Changer
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ToggleGroup<T extends string>({
  values,
  active,
  onChange,
  renderLabel,
  testidPrefix,
}: {
  values: readonly T[];
  active: T;
  onChange: (value: T) => void;
  renderLabel: (value: T) => string;
  testidPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={value === active ? "default" : "outline"}
          className={cn("h-7 px-2 text-xs")}
          onClick={() => onChange(value)}
          data-testid={`${testidPrefix}-${value}`}
        >
          {renderLabel(value)}
        </Button>
      ))}
    </div>
  );
}

export function TicketForm() {
  const navigate = useNavigate();
  const create = useMutation(api.support_tickets.mutations.create);

  const [client, setClient] = React.useState<ClientPick | null>(null);
  const [category, setCategory] = React.useState<Category>("machine_panne");
  const [priority, setPriority] = React.useState<Priority>("normal");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [documentType, setDocumentType] = React.useState<DocumentType>("none");
  const [documentId, setDocumentId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const titleInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = React.useCallback(async () => {
    if (!client || client.code.length === 0) {
      toast.error("Client requis.");
      return;
    }
    if (title.trim().length === 0) {
      toast.error("Titre requis.");
      return;
    }
    if (description.trim().length === 0) {
      toast.error("Description requise.");
      return;
    }
    if (documentType !== "none" && documentId.trim().length === 0) {
      toast.error("Identifiant du document lié requis.");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const result = await create({
        client_id: client.id,
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
        delivery_form_id:
          documentType === "delivery_form"
            ? (documentId.trim() as unknown as Id<"delivery_forms">)
            : null,
        invoice_id:
          documentType === "invoice"
            ? (documentId.trim() as unknown as Id<"invoices">)
            : null,
        product_id:
          documentType === "product"
            ? (documentId.trim() as unknown as Id<"products">)
            : null,
      });
      toast.success(`Ticket ${result.number} créé.`);
      await navigate({
        to: "/app/tickets/$ticketId",
        params: { ticketId: String(result.id) },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Création du ticket impossible.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    category,
    client,
    create,
    description,
    documentId,
    documentType,
    navigate,
    priority,
    saving,
    title,
  ]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit]);

  return (
    <Card data-testid="ticket-form">
      <CardHeader>
        <CardTitle className="text-base">Nouveau ticket SAV</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <ClientAutocomplete
            selected={client && client.code.length > 0 ? client : null}
            onPick={(picked) =>
              setClient(picked.code.length === 0 ? null : picked)
            }
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Catégorie</Label>
            <ToggleGroup
              values={CATEGORIES}
              active={category}
              onChange={setCategory}
              renderLabel={(value) => TICKET_CATEGORY_LABEL[value]}
              testidPrefix="ticket-form-category"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Priorité</Label>
            <ToggleGroup
              values={PRIORITIES}
              active={priority}
              onChange={setPriority}
              renderLabel={(value) => TICKET_PRIORITY_LABEL[value]}
              testidPrefix="ticket-form-priority"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-form-title" className="text-xs">
              Titre
            </Label>
            <Input
              id="ticket-form-title"
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cafetière X3 ne chauffe plus"
              className="h-8 text-[13px]"
              data-testid="ticket-form-title"
              maxLength={120}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-form-description" className="text-xs">
              Description
            </Label>
            <Textarea
              id="ticket-form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexte, symptômes, action déjà tentée…"
              rows={4}
              className="font-mono text-[13px]"
              data-testid="ticket-form-description"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Document lié (optionnel)</Label>
            <ToggleGroup<DocumentType>
              values={["none", "delivery_form", "invoice", "product"]}
              active={documentType}
              onChange={(value) => {
                setDocumentType(value);
                if (value === "none") setDocumentId("");
              }}
              renderLabel={(value) =>
                value === "none"
                  ? "Aucun"
                  : value === "delivery_form"
                    ? "BL"
                    : value === "invoice"
                      ? "Facture"
                      : "Produit"
              }
              testidPrefix="ticket-form-doctype"
            />
            {documentType !== "none" ? (
              <Input
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder={`ID Convex du document ${documentType}`}
                className="h-8 font-mono text-[13px]"
                data-testid="ticket-form-document-id"
              />
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-muted-foreground font-mono text-xs">
              Ctrl+S pour enregistrer
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              data-testid="ticket-form-submit"
            >
              {saving ? "Enregistrement…" : "Créer le ticket"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
