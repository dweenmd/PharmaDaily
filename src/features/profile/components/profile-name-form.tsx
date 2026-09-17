"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateOwnNameAction } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function ProfileNameForm({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(name);
  const [isPending, startTransition] = React.useTransition();

  const changed = value.trim() !== name && value.trim() !== "";

  function save() {
    startTransition(async () => {
      const result = await updateOwnNameAction({ name: value.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Name updated");
      router.refresh();
    });
  }

  return (
    <Field>
      <FieldLabel htmlFor="profile-name">Name</FieldLabel>
      <div className="flex gap-2">
        <Input
          id="profile-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          className="max-w-xs"
        />
        <Button size="sm" onClick={save} disabled={!changed || isPending}>
          {isPending && <Spinner />}
          Save
        </Button>
      </div>
    </Field>
  );
}
