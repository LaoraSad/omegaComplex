import { CardsSkeleton, TableSkeleton } from "@/components/admin/Skeletons";

export default function Loading() {
  return (
    <div className="space-y-6" aria-label="Cargando contenido">
      <div className="space-y-2">
        <div className="askeleton h-3 w-28" />
        <div className="askeleton h-7 w-56" />
        <div className="askeleton h-4 w-full max-w-md" />
      </div>
      <TableSkeleton rows={5} cols={8} />
      <CardsSkeleton count={2} />
    </div>
  );
}
