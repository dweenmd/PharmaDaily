import { FilePlus2, FileX2, PencilLine } from "lucide-react";

import { AUDITED_TABLES } from "@/features/audit/constants";
import { type AuditEntry } from "@/features/audit/queries";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

/** Fields whose raw value says nothing useful on its own. */
const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at"]);

/**
 * Renders a value the way a person reads it rather than the way Postgres
 * stores it — a JSON `null` as an em dash, a boolean as yes/no.
 */
function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanField(field: string): string {
  return field
    .replace(/_id$/, "")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

const ACTION_STYLE: Record<string, { label: string; icon: typeof PencilLine; tone: string }> = {
  INSERT: { label: "Created", icon: FilePlus2, tone: "text-emerald-700 dark:text-emerald-500" },
  UPDATE: { label: "Changed", icon: PencilLine, tone: "text-blue-700 dark:text-blue-500" },
  DELETE: { label: "Removed", icon: FileX2, tone: "text-red-700 dark:text-red-500" },
};

/**
 * One audit entry, showing WHAT CHANGED rather than two blobs of JSON.
 *
 * A log nobody reads protects nothing, and "here are the before and after
 * rows, diff them yourself" is a log nobody reads.
 */
export function AuditRow({ entry }: { entry: AuditEntry }) {
  const style = ACTION_STYLE[entry.action] ?? ACTION_STYLE.UPDATE!;
  const Icon = style.icon;

  const oldData = (entry.old_data ?? {}) as Record<string, unknown>;
  const newData = (entry.new_data ?? {}) as Record<string, unknown>;

  const changes = (entry.changed_fields ?? []).filter((f) => !HIDDEN_FIELDS.has(f));

  return (
    <div className="flex gap-3 p-4">
      <div className={`mt-0.5 shrink-0 ${style.tone}`}>
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{entry.actor?.name ?? "Unknown user"}</span>
          <span className="text-muted-foreground">{style.label.toLowerCase()}</span>
          <Badge variant="secondary">{AUDITED_TABLES[entry.table_name] ?? entry.table_name}</Badge>
          {entry.branch?.code && (
            <Badge variant="outline" className="font-mono text-[10px]">
              {entry.branch.code}
            </Badge>
          )}
        </div>

        {entry.action === "UPDATE" && changes.length > 0 && (
          <ul className="space-y-0.5 text-xs">
            {changes.slice(0, 6).map((field) => (
              <li key={field} className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-muted-foreground">{humanField(field)}:</span>
                <span className="text-muted-foreground line-through">
                  {renderValue(oldData[field])}
                </span>
                <span aria-hidden>→</span>
                <span className="font-medium">{renderValue(newData[field])}</span>
              </li>
            ))}
            {changes.length > 6 && (
              <li className="text-muted-foreground">and {changes.length - 6} more fields</li>
            )}
          </ul>
        )}

        {entry.action === "DELETE" && (
          <p className="text-muted-foreground text-xs">
            {renderValue(oldData.name ?? oldData.invoice_no ?? oldData.batch_no ?? entry.record_id)}
          </p>
        )}

        {entry.action === "INSERT" && (
          <p className="text-muted-foreground text-xs">
            {renderValue(newData.name ?? newData.code ?? entry.record_id)}
          </p>
        )}

        <p className="text-muted-foreground text-[10px]">{formatDateTime(entry.created_at)}</p>
      </div>
    </div>
  );
}
