"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Archive, Check, LoaderCircle, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { CategoryRecord } from "@/features/catalog/catalog.types";

type Category = Pick<CategoryRecord, "id" | "name" | "slug" | "description" | "isActive" | "_count">;
type ApiResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

async function requestCategory<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || result.error) {
    throw new Error(result.error?.message ?? "No fue posible completar la operación.");
  }
  return result.data;
}

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  function showFailure(reason: unknown) {
    setSuccess("");
    setError(reason instanceof Error ? reason.message : "No fue posible completar la operación.");
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const created = await requestCategory<Category>("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name, description: description.trim() || null }),
        });
        setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        setName("");
        setDescription("");
        setSuccess("Categoría creada.");
      } catch (reason) {
        showFailure(reason);
      }
    });
  }

  function beginEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
    setError("");
    setSuccess("");
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>, category: Category) {
    event.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const updated = await requestCategory<Category>(`/api/categories/${category.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: editName,
            description: editDescription.trim() || null,
          }),
        });
        setCategories((current) => current.map((item) => item.id === updated.id ? updated : item)
          .sort((a, b) => a.name.localeCompare(b.name)));
        setEditingId(null);
        setSuccess("Categoría actualizada.");
      } catch (reason) {
        showFailure(reason);
      }
    });
  }

  function handleStatus(category: Category, isActive: boolean) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const updated = await requestCategory<Category>(`/api/categories/${category.id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        });
        setCategories((current) => current.map((item) => item.id === updated.id ? updated : item));
        setSuccess(isActive ? "Categoría reactivada." : "Categoría archivada.");
      } catch (reason) {
        showFailure(reason);
      }
    });
  }

  function handleArchive() {
    if (!archiveTarget) return;
    const target = archiveTarget;
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        const archived = await requestCategory<Category>(`/api/categories/${target.id}`, { method: "DELETE" });
        setCategories((current) => current.map((item) => item.id === archived.id ? archived : item));
        setArchiveTarget(null);
        setSuccess("Categoría archivada; sus servicios e historial se conservaron.");
      } catch (reason) {
        showFailure(reason);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="acard acard-pad">
        <div className="acard-head">
          <div>
            <h2 className="acard-title">Nueva categoría</h2>
            <p className="acard-sub">El slug se genera automáticamente a partir del nombre.</p>
          </div>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.5fr)_auto] md:items-end">
          <div>
            <label className="alabel" htmlFor="category-name">Nombre</label>
            <input id="category-name" className="ainput" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required />
          </div>
          <div>
            <label className="alabel" htmlFor="category-description">Descripción</label>
            <input id="category-description" className="ainput" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
          </div>
          <button className="abtn abtn-primary" type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear categoría
          </button>
        </form>
      </section>

      {error ? <p role="alert" className="aalert aalert-error">{error}</p> : null}
      {success ? <p role="status" className="aalert aalert-info">{success}</p> : null}

      <section className="acard acard-pad">
        <div className="acard-head">
          <div>
            <h2 className="acard-title">Categorías registradas</h2>
            <p className="acard-sub">Las archivadas no aparecen en el catálogo público.</p>
          </div>
          <span className="akpi-label">{categories.length} en total</span>
        </div>
        <div className="atable-wrap">
          <table className="atable">
            <thead>
              <tr><th scope="col">Nombre</th><th scope="col">Slug</th><th scope="col">Servicios</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    {editingId === category.id ? (
                      <form id={`edit-category-${category.id}`} onSubmit={(event) => handleUpdate(event, category)} className="grid gap-2">
                        <input aria-label="Nombre de categoría" className="ainput" value={editName} onChange={(event) => setEditName(event.target.value)} minLength={2} maxLength={80} required />
                        <input aria-label="Descripción" className="ainput" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={500} />
                      </form>
                    ) : (
                      <><span className="block font-bold">{category.name}</span><span className="block text-xs text-[#6f625e]">{category.description || "Sin descripción"}</span></>
                    )}
                  </td>
                  <td className="font-mono text-xs">{category.slug}</td>
                  <td className="anum">{category._count.services}</td>
                  <td><span className={`abadge ${category.isActive ? "abadge-success" : "abadge-neutral"}`}>{category.isActive ? "Activa" : "Archivada"}</span></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {editingId === category.id ? (
                        <>
                          <button className="aicon-btn" type="submit" form={`edit-category-${category.id}`} aria-label="Guardar categoría" disabled={pending}><Check className="h-4 w-4" /></button>
                          <button className="aicon-btn" type="button" aria-label="Cancelar edición" disabled={pending} onClick={() => setEditingId(null)}><X className="h-4 w-4" /></button>
                        </>
                      ) : (
                        <>
                          <button className="aicon-btn" type="button" aria-label={`Editar ${category.name}`} disabled={pending} onClick={() => beginEdit(category)}><Pencil className="h-4 w-4" /></button>
                          {category.isActive ? (
                            <button className="aicon-btn" type="button" aria-label={`Archivar ${category.name}`} disabled={pending} onClick={() => setArchiveTarget(category)}><Archive className="h-4 w-4" /></button>
                          ) : (
                            <button className="aicon-btn" type="button" aria-label={`Reactivar ${category.name}`} disabled={pending} onClick={() => handleStatus(category, true)}><RotateCcw className="h-4 w-4" /></button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-sm text-[#6f625e]">Aún no hay categorías registradas.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {archiveTarget ? (
        <ConfirmDialog
          title="Archivar categoría"
          text={`Se archivará “${archiveTarget.name}”. No aparecerá en el catálogo público; los servicios y reservas existentes se conservarán.`}
          confirmLabel="Archivar categoría"
          pending={pending}
          onConfirm={handleArchive}
          onCancel={() => { if (!pending) setArchiveTarget(null); }}
        />
      ) : null}
    </div>
  );
}