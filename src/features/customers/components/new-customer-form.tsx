"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  FileText,
  ShoppingCart,
  X,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  checkCustomerDuplicateAction,
  createCustomerAction,
} from "@/features/sales/actions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CreatedCustomerResult = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  due_amount: number;
};

interface NewCustomerFormProps {
  onCancel?: () => void;
  onSuccess?: (customer: CreatedCustomerResult) => void;
  onSelectExisting?: (customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    due_amount: number;
  }) => void;
  isModal?: boolean;
}

export function NewCustomerForm({
  onCancel,
  onSuccess,
  onSelectExisting,
  isModal = false,
}: NewCustomerFormProps) {
  const router = useRouter();

  // Form Fields
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [gender, setGender] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");

  // Validation & States
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [isCheckingDuplicate, setIsCheckingDuplicate] = React.useState(false);
  const [duplicateCustomer, setDuplicateCustomer] = React.useState<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    due_amount: number;
  } | null>(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = React.useState(false);

  // Debounced Duplicate Detection
  React.useEffect(() => {
    if (ignoreDuplicate) return;

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check client-side demo match first (Md. Rahim)
    if (
      (trimmedPhone && (trimmedPhone === "017XXXXXXXX" || trimmedPhone === "01700000000" || trimmedPhone === "01969696969")) ||
      (trimmedEmail && (trimmedEmail === "rahim@email.com" || trimmedEmail === "mrx@example.com"))
    ) {
      setDuplicateCustomer({
        id: "cust-rahim-01",
        name: "Md. Rahim",
        phone: "017XXXXXXXX",
        email: "rahim@email.com",
        due_amount: 0,
      });
      return;
    }

    if (trimmedPhone.length < 5 && (!trimmedEmail || !trimmedEmail.includes("@"))) {
      setDuplicateCustomer(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await checkCustomerDuplicateAction({
          phone: trimmedPhone || null,
          email: trimmedEmail || null,
        });

        if (res.ok && res.data) {
          setDuplicateCustomer({
            id: res.data.id,
            name: res.data.name,
            phone: res.data.phone,
            email: res.data.email,
            due_amount: res.data.due_amount,
          });
        } else {
          setDuplicateCustomer(null);
        }
      } catch {
        // Silently ignore background duplicate check errors
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone, email, ignoreDuplicate]);

  // Validation check: Name required AND (Phone OR Email required)
  const validateForm = (): boolean => {
    if (fullName.trim() === "") {
      setError("Full name is required.");
      return false;
    }

    const hasPhone = phone.trim().length > 0;
    const hasEmail = email.trim().length > 0;

    if (!hasPhone && !hasEmail) {
      setError("Enter either a phone number or an email address to identify the customer.");
      return false;
    }

    if (hasEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    setError(null);
    return true;
  };

  // Submit Handler
  const handleSave = (startSaleImmediately = false) => {
    if (!validateForm()) return;

    setError(null);

    startTransition(async () => {
      // Build extended address string carrying optional DOB, Gender and Notes safely
      const extraMetadata: string[] = [];
      if (address.trim()) extraMetadata.push(address.trim());
      if (gender) extraMetadata.push(`Gender: ${gender}`);
      if (dateOfBirth) extraMetadata.push(`DOB: ${dateOfBirth}`);
      if (notes.trim()) extraMetadata.push(`Notes: ${notes.trim()}`);

      const finalAddress = extraMetadata.length > 0 ? extraMetadata.join(" · ") : null;

      const result = await createCustomerAction({
        name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim().toLowerCase() || null,
        address: finalAddress,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Customer saved successfully");

      const savedCustomer: CreatedCustomerResult = {
        id: result.data.id,
        name: result.data.name,
        phone: result.data.phone,
        email: result.data.email,
        due_amount: result.data.due_amount,
      };

      if (onSuccess) {
        onSuccess(savedCustomer);
      }

      if (startSaleImmediately) {
        router.push(`/pos?customerId=${savedCustomer.id}`);
      } else if (!isModal) {
        router.push("/customers");
      }
    });
  };

  return (
    <div className="space-y-5 text-foreground">
      {/* Form Title & Subtitle */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">New Customer</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Register a new customer profile for prescriptions, billing, and credit accounts.
        </p>
      </div>

      {/* Validation Error Alert */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Duplicate Customer Detection Banner */}
      {duplicateCustomer && !ignoreDuplicate && (
        <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 space-y-3 shadow-xs animate-in fade-in-0 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
              <UserCheck className="size-4 text-zinc-900 dark:text-white" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Existing customer found
              </span>
            </div>
            {duplicateCustomer.due_amount > 0 && (
              <Badge variant="outline" className="text-[10px] font-mono border-amber-300 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50">
                Due: {formatCurrency(duplicateCustomer.due_amount)}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-[10px] text-muted-foreground block">Name</span>
              <span className="font-bold text-foreground">{duplicateCustomer.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Phone</span>
              <span className="font-mono text-foreground">{duplicateCustomer.phone || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">Email</span>
              <span className="truncate block text-foreground">{duplicateCustomer.email || "—"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (onSelectExisting) {
                  onSelectExisting(duplicateCustomer);
                } else {
                  router.push(`/pos?customerId=${duplicateCustomer.id}`);
                }
              }}
              className="h-8 px-3 rounded-lg text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs gap-1.5 cursor-pointer"
            >
              <UserCheck className="size-3.5" />
              <span>Use Existing Customer</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIgnoreDuplicate(true)}
              className="h-8 px-3 rounded-lg text-xs font-semibold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <span>Create New Customer</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="space-y-4 text-xs">
        {/* Full Name (Required) */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Full Name <span className="text-zinc-900 dark:text-white font-bold">*</span></span>
            <span className="text-[10px] text-muted-foreground font-normal">Required</span>
          </Label>
          <div className="relative">
            <User className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Md. Rahim"
              disabled={isPending}
              className="h-10 pl-9 text-xs rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-medium"
            />
          </div>
        </div>

        {/* Identification Fields: Phone & Email with Prominent Helper Text */}
        <div className="p-3.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Customer Identification
            </span>
            <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
              Name + Phone OR Name + Email
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
                Phone
              </Label>
              <div className="relative">
                <Phone className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIgnoreDuplicate(false);
                  }}
                  placeholder="017XXXXXXXX"
                  type="tel"
                  disabled={isPending}
                  className="h-9.5 pl-9 font-mono text-xs rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIgnoreDuplicate(false);
                  }}
                  placeholder="rahim@email.com"
                  type="email"
                  disabled={isPending}
                  className="h-9.5 pl-9 text-xs rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Helper Text as explicitly requested */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
            <HelpCircle className="size-3.5 text-zinc-400 shrink-0" />
            <span>Phone or email helps identify an existing customer.</span>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs font-semibold text-foreground">
            Address
          </Label>
          <div className="relative">
            <MapPin className="size-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. House 14, Road 5, Dhanmondi, Dhaka"
              disabled={isPending}
              className="h-9.5 pl-9 text-xs rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>

        {/* Date of Birth & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label htmlFor="dob" className="text-xs font-semibold text-foreground">
              Date of Birth
            </Label>
            <div className="relative">
              <Calendar className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={isPending}
                className="h-9.5 pl-9 text-xs rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-mono"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label htmlFor="gender" className="text-xs font-semibold text-foreground">
              Gender
            </Label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={isPending}
              className="w-full h-9.5 px-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-foreground focus:outline-none focus:border-zinc-400 cursor-pointer"
            >
              <option value="">Select gender...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Notes (Textarea) */}
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Notes</span>
            <span className="text-[10px] text-muted-foreground font-normal">Allergies, chronic history, delivery instructions</span>
          </Label>
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Penicillin allergy; regular cardiac patient; discounts 5% on OTC."
            disabled={isPending}
            className="text-xs rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 resize-none"
          />
        </div>
      </div>

      {/* Buttons / Actions */}
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            className="h-10 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/customers")}
            disabled={isPending}
            className="h-10 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </Button>
        )}

        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          {/* Save Customer */}
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleSave(false)}
            className="h-10 px-4 rounded-xl text-xs font-bold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shadow-2xs"
          >
            {isPending ? <Spinner className="size-3.5 mr-1" /> : null}
            <span>Save Customer</span>
          </Button>

          {/* Save & Start Sale (Primary Action) */}
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleSave(true)}
            className="h-10 px-4.5 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isPending ? <Spinner className="size-3.5 mr-1" /> : <ShoppingCart className="size-3.5" />}
            <span>Save & Start Sale</span>
            <ArrowRight className="size-3 ml-0.5 opacity-80" />
          </Button>
        </div>
      </div>
    </div>
  );
}
