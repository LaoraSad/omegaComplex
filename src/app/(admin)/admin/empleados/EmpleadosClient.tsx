"use client";

import { useState, useTransition } from "react";
import { KeyRound, MapPin, Power, Save, UserPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { ZoneGroup } from "@/features/admin/admin.types";
import {
  createEmployeeAction,
  setEmployeeActiveAction,
  setEmployeePasswordAction,
  setEmployeeZonesAction,
  updateEmployeeAction,
  type EmployeeActionResult,
} from "./actions";

// ---------------------------------------------------------------------------
// Selección de zonas
// ---------------------------------------------------------------------------

interface ZonePickerProps {
  groups: ZoneGroup[];
  selected: string[];
  onToggle: (serviceId: string) => void;
  idPrefix: string;
}

/** Checkboxes por categoría. El name "serviceIds" es lo que lee la action. */
function ZonePicker({ groups, selected, onToggle, idPrefix }: ZonePickerProps) {
  const selectedSet = new Set(selected);

  return (
    <fieldset className="space-y-3">
      <legend className="alabel">
        Zonas asignadas <span className="font-normal text-[#6f625e]">(obligatorio)</span>
      </legend>
      <p className="afield-hint">
        El empleado solo valida QR de estas instalaciones. Si el QR corresponde a otra zona, debe
        directinglo al lugar correcto.
      </p>
      {groups.map((group) => (
        <div key={group.categoryId} className="rounded-[10px] border border-[#e8e1de] p-3">
          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wider text-[#6f625e]">
            {group.categoryName}
          </p>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {group.services.map((service) => {
              const inputId = `${idPrefix}-${service.id}`;
              return (
                <li key={service.id}>
                  <label
                    htmlFor={inputId}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#faf8f7]"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      name="serviceIds"
                      value={service.id}
                      checked={selectedSet.has(service.id)}
                      onChange={() => onToggle(service.id)}
                      className="h-4 w-4 accent-[#7a1f3d]"
                    />
                    <span>{service.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs font-semibold text-[#6f625e]">
        {selected.length === 1
          ? "1 zona seleccionada."
          : `${selected.length} zonas seleccionadas.`}
      </p>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Alta de empleado
// ---------------------------------------------------------------------------

/** Envoltorio con el botón que despliega el formulario de alta. */
export function EmployeeCreateSection({ groups }: { groups: ZoneGroup[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="abtn abtn-primary"
        style={{ width: "fit-content" }}
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4" />
        Nuevo empleado
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="abtn abtn-secondary"
        style={{ width: "fit-content" }}
        onClick={() => setOpen(false)}
      >
        Cancelar alta
      </button>
      <CreateEmployeeForm groups={groups} />
    </div>
  );
}

/** Alta de empleado con sus credenciales y zonas iniciales. */
export function CreateEmployeeForm({ groups }: { groups: ZoneGroup[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<EmployeeActionResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  function toggleZone(serviceId: string) {
    setSelected((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await createEmployeeAction(formData);
      setFeedback(result);
      if (result.ok) {
        setSelected([]);
        formData.set("password", "");
      }
    });
  }

  return (
    <section aria-label="Nuevo empleado" className="acard acard-pad space-y-4">
      <div className="acard-head">
        <div>
          <h2 className="acard-title">Nuevo empleado</h2>
          <p className="acard-sub">
            Crea las credenciales y asigna las zonas que podrá validar.
          </p>
        </div>
        <UserPlus className="h-5 w-5 text-[#7a1f3d]" />
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="afilters">
          <div className="afield">
            <label className="alabel" htmlFor="e-firstName">Nombre</label>
            <input
              id="e-firstName"
              name="firstName"
              type="text"
              required
              maxLength={100}
              className="ainput"
              autoComplete="given-name"
            />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="e-lastName">Apellido</label>
            <input
              id="e-lastName"
              name="lastName"
              type="text"
              required
              maxLength={100}
              className="ainput"
              autoComplete="family-name"
            />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="e-document">Documento</label>
            <input
              id="e-document"
              name="document"
              type="text"
              required
              maxLength={20}
              className="ainput"
              autoComplete="off"
            />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="e-phone">Teléfono</label>
            <input
              id="e-phone"
              name="phone"
              type="tel"
              required
              maxLength={20}
              className="ainput"
              autoComplete="tel"
            />
          </div>
          <div className="afield afield-grow">
            <label className="alabel" htmlFor="e-email">Correo</label>
            <input
              id="e-email"
              name="email"
              type="email"
              required
              maxLength={255}
              className="ainput"
              autoComplete="off"
            />
          </div>
          <div className="afield">
            <label className="alabel" htmlFor="e-password">Contraseña inicial</label>
            <input
              id="e-password"
              name="password"
              type="text"
              required
              minLength={8}
              maxLength={100}
              className="ainput"
              autoComplete="off"
            />
            <p className="afield-hint">Mínimo 8 caracteres.</p>
          </div>
        </div>

        <ZonePicker
          groups={groups}
          selected={selected}
          onToggle={toggleZone}
          idPrefix="new-zone"
        />

        <button type="submit" className="abtn abtn-primary" disabled={pending}>
          <UserPlus className="h-4 w-4" />
          Crear empleado
        </button>
      </form>

      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={`aalert ${feedback.ok ? "aalert-info" : "aalert-error"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Detalle: perfil
// ---------------------------------------------------------------------------

interface EmployeeProfileValues {
  firstName: string;
  lastName: string;
  document: string;
  email: string;
  phone: string | null;
}

/** Edición de los datos del empleado. El correo no se cambia aquí. */
export function EmployeeProfileForm({
  employeeId,
  values,
}: {
  employeeId: string;
  values: EmployeeProfileValues;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<EmployeeActionResult | null>(null);

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await updateEmployeeAction(employeeId, formData));
    });
  }

  return (
    <section aria-label="Datos del empleado" className="acard acard-pad space-y-4">
      <h2 className="acard-title">Datos</h2>
      <form action={handleSubmit} className="afilters">
        <div className="afield">
          <label className="alabel" htmlFor="p-firstName">Nombre</label>
          <input
            id="p-firstName"
            name="firstName"
            type="text"
            required
            maxLength={100}
            defaultValue={values.firstName}
            className="ainput"
            autoComplete="off"
          />
        </div>
        <div className="afield">
          <label className="alabel" htmlFor="p-lastName">Apellido</label>
          <input
            id="p-lastName"
            name="lastName"
            type="text"
            required
            maxLength={100}
            defaultValue={values.lastName}
            className="ainput"
            autoComplete="off"
          />
        </div>
        <div className="afield">
          <label className="alabel" htmlFor="p-document">Documento</label>
          <input
            id="p-document"
            name="document"
            type="text"
            required
            maxLength={20}
            defaultValue={values.document}
            className="ainput"
            autoComplete="off"
          />
        </div>
        <div className="afield">
          <label className="alabel" htmlFor="p-phone">Teléfono</label>
          <input
            id="p-phone"
            name="phone"
            type="tel"
            required
            maxLength={20}
            defaultValue={values.phone ?? ""}
            className="ainput"
            autoComplete="off"
          />
        </div>
        <div className="afield afield-grow">
          <span className="alabel">Correo</span>
          <input
            type="email"
            value={values.email}
            readOnly
            disabled
            className="ainput"
            aria-label="Correo del empleado"
          />
          <p className="afield-hint">El correo es la clave de acceso y no se modifica aquí.</p>
        </div>
        <div className="flex items-end">
          <button type="submit" className="abtn abtn-primary" disabled={pending}>
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </form>
      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={`aalert ${feedback.ok ? "aalert-info" : "aalert-error"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Detalle: zonas
// ---------------------------------------------------------------------------

/** Reemplaza el conjunto completo de zonas del empleado. */
export function EmployeeZoneEditor({
  employeeId,
  groups,
  assignedIds,
}: {
  employeeId: string;
  groups: ZoneGroup[];
  assignedIds: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<EmployeeActionResult | null>(null);
  const [selected, setSelected] = useState<string[]>(assignedIds);

  function toggleZone(serviceId: string) {
    setSelected((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await setEmployeeZonesAction(employeeId, formData));
    });
  }

  return (
    <section aria-label="Zonas del empleado" className="acard acard-pad space-y-4">
      <div className="acard-head">
        <div>
          <h2 className="acard-title">Zonas asignadas</h2>
          <p className="acard-sub">
            Solo podrá validar QR de las instalaciones seleccionadas.
          </p>
        </div>
        <MapPin className="h-5 w-5 text-[#7a1f3d]" />
      </div>
      <form action={handleSubmit} className="space-y-4">
        <ZonePicker
          groups={groups}
          selected={selected}
          onToggle={toggleZone}
          idPrefix={`zone-${employeeId}`}
        />
        <button type="submit" className="abtn abtn-primary" disabled={pending}>
          <Save className="h-4 w-4" />
          Guardar zonas
        </button>
      </form>
      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={`aalert ${feedback.ok ? "aalert-info" : "aalert-error"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Detalle: contraseña
// ---------------------------------------------------------------------------

/** Restablece la contraseña del empleado. */
export function EmployeePasswordForm({ employeeId }: { employeeId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<EmployeeActionResult | null>(null);

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await setEmployeePasswordAction(employeeId, formData));
    });
  }

  return (
    <section aria-label="Credenciales" className="acard acard-pad space-y-4">
      <div className="acard-head">
        <div>
          <h2 className="acard-title">Contraseña</h2>
          <p className="acard-sub">Restablece la clave con la que inicia sesión.</p>
        </div>
        <KeyRound className="h-5 w-5 text-[#7a1f3d]" />
      </div>
      <form action={handleSubmit} className="afilters">
        <div className="afield afield-grow">
          <label className="alabel" htmlFor={`pw-${employeeId}`}>Nueva contraseña</label>
          <input
            id={`pw-${employeeId}`}
            name="password"
            type="text"
            required
            minLength={8}
            maxLength={100}
            className="ainput"
            autoComplete="off"
          />
          <p className="afield-hint">Mínimo 8 caracteres.</p>
        </div>
        <div className="flex items-end">
          <button type="submit" className="abtn abtn-secondary" disabled={pending}>
            <KeyRound className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </form>
      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={`aalert ${feedback.ok ? "aalert-info" : "aalert-error"}`}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Detalle: activar / desactivar
// ---------------------------------------------------------------------------

/** Activa o desactiva al empleado, con confirmación explícita. */
export function EmployeeActiveToggle({
  employeeId,
  name,
  isActive,
}: {
  employeeId: string;
  name: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<EmployeeActionResult | null>(null);

  function handleConfirm() {
    setFeedback(null);
    startTransition(async () => {
      const result = await setEmployeeActiveAction(employeeId, !isActive);
      setFeedback(result);
      setConfirming(false);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={`abtn ${isActive ? "abtn-danger" : "abtn-primary"}`}
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        <Power className="h-4 w-4" />
        {isActive ? "Desactivar" : "Activar"}
      </button>
      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={`aalert ${feedback.ok ? "aalert-info" : "aalert-error"}`}>
          {feedback.message}
        </p>
      ) : null}
      {confirming ? (
        <ConfirmDialog
          title={isActive ? "Desactivar empleado" : "Activar empleado"}
          text={
            isActive
              ? `${name} no podrá iniciar sesión ni validar QR. Su historial de accesos se conserva.`
              : `${name} podrá volver a iniciar sesión y validar QR en sus zonas asignadas.`
          }
          confirmLabel={isActive ? "Desactivar" : "Activar"}
          pending={pending}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!pending) setConfirming(false);
          }}
        />
      ) : null}
    </div>
  );
}