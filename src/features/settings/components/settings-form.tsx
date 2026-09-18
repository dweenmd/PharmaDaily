"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EDITABLE_SETTINGS, saveSettingAction, type SettingKey } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  values: Record<string, { value: string; scope: "branch" | "global" }>;
  /** null edits the chain-wide default; a branch id overrides it locally. */
  branchId: string | null;
  branchName: string | null;
};

export function SettingsForm({ values, branchId, branchName }: Props) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.keys(EDITABLE_SETTINGS).map((key) => [key, values[key]?.value ?? ""]),
    ),
  );
  const [savingKey, setSavingKey] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function save(key: SettingKey) {
    setSavingKey(key);

    startTransition(async () => {
      const result = await saveSettingAction(key, draft[key] ?? "", branchId);
      setSavingKey(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Saved", {
        description: branchName
          ? `Applies to ${branchName}.`
          : "Applies across every branch that has no override.",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {(Object.keys(EDITABLE_SETTINGS) as SettingKey[]).map((key) => {
        const spec = EDITABLE_SETTINGS[key];
        const current = values[key];
        const changed = draft[key] !== (current?.value ?? "");

        return (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{spec.label}</CardTitle>
              <CardDescription>{spec.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                {spec.type === "select" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={key} className="text-xs">
                      Value
                    </Label>
                    <Select
                      value={draft[key] ?? ""}
                      onValueChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                      disabled={isPending}
                    >
                      <SelectTrigger id={key} className="w-40">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        {spec.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : spec.type === "number" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={key} className="text-xs">
                      Value ({spec.unit})
                    </Label>
                    <Input
                      id={key}
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      inputMode="decimal"
                      className="w-32 text-right tabular-nums"
                      disabled={isPending}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor={key} className="text-xs">
                      Value
                    </Label>
                    <Input
                      id={key}
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                      className="w-64 text-xs"
                      disabled={isPending}
                    />
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => save(key)}
                  disabled={isPending || !changed || draft[key] === ""}
                >
                  {savingKey === key && <Spinner />}
                  Save
                </Button>

                {changed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setDraft((d) => ({ ...d, [key]: current?.value ?? "" }))}
                  >
                    Undo
                  </Button>
                )}
              </div>

              <p className="text-muted-foreground text-xs">
                {spec.type === "number" && `Allowed range ${spec.min}–${spec.max} ${spec.unit}. `}
                {current?.scope === "branch"
                  ? "This branch overrides the chain default."
                  : branchId
                    ? "Currently using the chain default — saving creates a branch override."
                    : "This is the chain default."}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
