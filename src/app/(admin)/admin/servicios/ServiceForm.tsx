"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Save } from "lucide-react";

import { IMAGENES_DISPONIBLES, REQUISITOS_360 } from "@/features/catalog/service-images";

type CategoriaOpcion = { id: string; name: string };

type ServicioInicial = {
  id: string;
  name: string;
  categoryId: string;
  description: string | null;
  price: number;
  capacity: number;
  imagen: string | null;
  isActive: boolean;
};

type ApiResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

async function requestService<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok || result.error) {
    throw new Error(result.error?.message ?? "No fue posible completar la operación.");
  }
  return result.data;
}

/**
 * Revisa la proporción de la foto sin subirla: el tour 360 necesita
 * equirectangular 2:1 y acá solo llega la ruta. Si no cumple, se avisa pero se
 * deja guardar (habrá portada normal, sin 360).
 *
 * La tolerancia es la misma que usa `esValidaPara360` en el módulo de catálogo,
 * para que el panel y el visor no se contradigan: las fotos de 1456x720 del
 * complejo tienen 2.02:1 y son válidas.
 */
function revisarProporcion360(
  ruta: string,
): Promise<{ ratio: number; es360: boolean } | null> {
  const src = ruta.trim();
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      resolve({
        ratio,
        es360:
          Math.abs(ratio - REQUISITOS_360.ratio) <= REQUISITOS_360.tolerancia,
      });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function ServiceForm({
  mode,
  initial,
  categorias,
}: {
  mode: "create" | "edit";
  initial?: ServicioInicial;
  categorias: CategoriaOpcion[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(initial?.name ?? "");
  const [categoriaId, setCategoriaId] = useState(initial?.categoryId ?? categorias[0]?.id ?? "");
  const [descripcion, setDescripcion] = useState(initial?.description ?? "");
  const [precio, setPrecio] = useState(String(initial?.price ?? ""));
  const [capacidad, setCapacidad] = useState(String(initial?.capacity ?? ""));
  const [imagen, setImagen] = useState(initial?.imagen ?? "");
  const [activo, setActivo] = useState(initial?.isActive ?? true);
  const [aviso360, setAviso360] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function onImagenChange(value: string) {
    setImagen(value);
    setAviso360("");
    const revision = await revisarProporcion360(value);
    if (revision && !revision.es360) {
      setAviso360(
        `La foto mide proporción ${revision.ratio.toFixed(2)}:1 y el tour 360 necesita 2:1. Se guardará como portada normal, sin 360.`,
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const body = {
        ...(mode === "create" ? { categoryId: categoriaId } : categoriaId !== initial?.categoryId ? { categoryId: categoriaId } : {}),
        name: nombre.trim(),
        description: descripcion.trim() || null,
        price: Number(precio),
        capacity: Number(capacidad),
        imagen: imagen.trim() || null,
        isActive: activo,
      };
      if (mode === "create") {
        await requestService("/api/services", { method: "POST", body: JSON.stringify(body) });
        setNombre("");
        setDescripcion("");
        setPrecio("");
        setCapacidad("");
        setImagen("");
        setActivo(true);
        setSuccess("Servicio creado. Configura sus horarios para generar franjas.");
      } else {
        await requestService(`/api/services/${initial!.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setSuccess("Servicio actualizado.");
      }
      router.refresh();
    } catch (reason) {
      setSuccess("");
      setError(reason instanceof Error ? reason.message : "No fue posible completar la operación.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-[#c8a96b] focus:outline-none";
  const labelCls = "block text-xs font-semibold text-white/65";

  return (
    <form onSubmit={handleSubmit} className="acard acard-pad space-y-4">
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">
        {mode === "create" ? "Nuevo servicio" : "Editar servicio"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={mode === "create" ? "svc-nombre" : "svc-nombre-edit"} className={labelCls}>
            Nombre
          </label>
          <input
            id={mode === "create" ? "svc-nombre" : "svc-nombre-edit"}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={busy}
            required
            minLength={2}
            maxLength={80}
            placeholder="Cancha 5"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={mode === "create" ? "svc-cat" : "svc-cat-edit"} className={labelCls}>
            Categoría
          </label>
          <select
            id={mode === "create" ? "svc-cat" : "svc-cat-edit"}
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            disabled={busy}
            required
            className={inputCls}
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#171215] text-white">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={mode === "create" ? "svc-precio" : "svc-precio-edit"} className={labelCls}>
            Precio (COP por hora)
          </label>
          <input
            id={mode === "create" ? "svc-precio" : "svc-precio-edit"}
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            disabled={busy}
            required
            inputMode="numeric"
            type="number"
            min={0}
            max={100000000}
            step={1}
            placeholder="30000"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={mode === "create" ? "svc-cap" : "svc-cap-edit"} className={labelCls}>
            Capacidad (personas por franja)
          </label>
          <input
            id={mode === "create" ? "svc-cap" : "svc-cap-edit"}
            value={capacidad}
            onChange={(e) => setCapacidad(e.target.value)}
            disabled={busy}
            required
            inputMode="numeric"
            type="number"
            min={1}
            max={1000}
            step={1}
            placeholder="14"
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={mode === "create" ? "svc-desc" : "svc-desc-edit"} className={labelCls}>
          Descripción (opcional)
        </label>
        <textarea
          id={mode === "create" ? "svc-desc" : "svc-desc-edit"}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={busy}
          rows={2}
          maxLength={500}
          placeholder="Superficie, dotación, reglas de uso…"
          className={inputCls}
        />
      </div>

          <div className="space-y-1.5">
            <label htmlFor={mode === "create" ? "svc-img" : "svc-img-edit"} className={labelCls}>
              Foto de la instalación
            </label>
            <select
              id={mode === "create" ? "svc-img" : "svc-img-edit"}
              value={imagen}
              onChange={(e) => void onImagenChange(e.target.value)}
              disabled={busy}
              className={inputCls}
            >
              <option value="">— Sin foto propia (usa la del catálogo) —</option>
              {IMAGENES_DISPONIBLES.map((ruta) => (
                <option key={ruta} value={ruta}>
                  {ruta.replace("/newassets/", "")}
                </option>
              ))}
            </select>
            {aviso360 ? <p role="status" className="text-xs font-semibold text-amber-300">{aviso360}</p> : null}
          </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-white/65">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          disabled={busy}
          className="h-4 w-4 accent-[#7a1f3d]"
        />
        Visible en el catálogo (desactivar oculta sin borrar reservas)
      </label>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-300/20 bg-red-950/30 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100">
          {success}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className="abtn abtn-primary">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "create" ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {mode === "create" ? "Crear servicio" : "Guardar cambios"}
      </button>
    </form>
  );
}
