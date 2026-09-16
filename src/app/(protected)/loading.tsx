import { PageSkeleton } from "@/components/shared/loading-skeletons";

/** Route-level fallback while an authenticated page streams in. */
export default function ProtectedLoading() {
  return <PageSkeleton />;
}
