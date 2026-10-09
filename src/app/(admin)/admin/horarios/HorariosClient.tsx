"use client";

import { useState, useTransition } from "react";
import { Ban, CalendarPlus, Clock3, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toInputDate } from "@/components/admin/format";
import type { ClosureRow } from "@/features/admin/admin.types";
import { blockFacilityAction, deleteServiceScheduleAction, saveServiceScheduleAction, unblockFacilityAction } from "./actions";

interface ServiceOption {
  id: string;
  name: string;
}

/** Formulario de bloqueo con confirmación explícita antes de guardar. */
export function BlockFacilityForm({ services }: { services: ServiceOption[] }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [payload, setPayload] = useState<FormData | null>(null);
  const today = toInputDate(new Date());

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    setPayload(formData);
    setConfirming(true);
  }

  function handleConfirm() {
    if (!payload) return;
    startTransition(async () => {
      const result = await blockFacilityAction(payload);
      setFeedback(result);
      setConfirming(false);
      setPayload(null);
    });
  }

  return (
    <div className="space-y-3">
      <form
        action={handleSubmit}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        <div className="sm:col-span-2 xl:col-span-2">
          <label className="alabel" htmlFor="b-service">Instalación</label>
          <select id="b-service" name="serviceId" className="aselect" defaultValue="">
            <option value="">Todo el complejo</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="alabel" htmlFor="b-from">Fecha de inicio</label>
          <input id="b-from" name="dateFrom" type="date" required min={today} className="ainput" />
        </div>
        <div>
          <label className="alabel" htmlFor="b-to">Fecha de fin</label>
          <input id="b-to" name="dateTo" type="date" required min={today} className="ainput" />
        </div>
        <div className="sm:col-span-2 xl:col-span-1">
          <label className="alabel" htmlFor="b-reason">Motivo</label>
          <input
            id="b-reason"
            name="reason"
            type="text"
            required
            minLength={4}
            maxLength={120}
            placeholder="Mantenimiento…"
            className="ainput"
            autoComplete="off"
          />
        </div>
        <div className="flex items-end sm:col-span-2 xl:col-span-5">
          <button type="submit" className="abtn abtn-danger" disabled={pending}>
            <Ban className="h-4 w-4" />
            Bloquear instalación
          </button>
        </div>
      </form>

      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={`aalert ${feedback.ok ? "aalert-info" : "aalert-error"}`}>
          {feedback.message}
        </p>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title="Confirmar bloqueo"
          text="Se registrará el bloqueo de la instalación en el rango de fechas indicado. Esta acción afecta la disponibilidad y debe usarse con criterio."
          confirmLabel="Confirmar bloqueo"
          pending={pending}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!pending) {
              setConfirming(false);
              setPayload(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

/** Fila de bloqueo con eliminación confirmada. */
export function ClosureDeleteButton({ closure }: { closure: ClosureRow }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = await unblockFacilityAction(closure.id);
      if (result.ok) {
        setConfirming(false);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="aicon-btn"
        style={{ border: "1px solid #e8e1de" }}
        aria-label={`Eliminar bloqueo: ${closure.reason}`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {error ? <p role="alert" className="afield-error">{error}</p> : null}
      {confirming ? (
        <ConfirmDialog
          title="Eliminar bloqueo"
          text={`Se eliminará el bloqueo "${closure.reason}". La instalación volverá a estar disponible en ese rango.`}
          confirmLabel="Eliminar bloqueo"
          pending={pending}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!pending) setConfirming(false);
          }}
        />
      ) : null}
    </>
  );
}

export function ScheduleForm({ services }: { services: ServiceOption[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveServiceScheduleAction(formData);
      setFeedback(result);
    });
  }

  return (
    <form action={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="sm:col-span-2 xl:col-span-2">
        <label className="alabel" htmlFor="s-service">Instalación</label>
        <select id="s-service" name="serviceId" className="aselect" defaultValue="">
          <option value="">Selecciona una instalación</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="alabel" htmlFor="s-day">Día</label>
        <select id="s-day" name="dayOfWeek" className="aselect" defaultValue="1">
          <option value="0">Domingo</option>
          <option value="1">Lunes</option>
          <option value="2">Martes</option>
          <option value="3">Miércoles</option>
          <option value="4">Jueves</option>
          <option value="5">Viernes</option>
          <option value="6">Sábado</option>
        </select>
      </div>
      <div>
        <label className="alabel" htmlFor="s-open">Apertura</label>
        <input id="s-open" name="openTime" type="time" defaultValue="08:00" className="ainput" />
      </div>
      <div>
        <label className="alabel" htmlFor="s-close">Cierre</label>
        <input id="s-close" name="closeTime" type="time" defaultValue="22:00" className="ainput" />
      </div>
      <div className="flex items-end sm:col-span-2 xl:col-span-5">
        <button type="submit" className="abtn abtn-primary" disabled={pending}>
          <Clock3 className="h-4 w-4" />
          Guardar horario
        </button>
      </div>
      {feedback ? (
        <p role={feedback.ok ? "status" : "alert"} className={`aalert ${feedback.ok ? "aalert-info" : "aalert-error"} sm:col-span-2 xl:col-span-5`}>
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}

export function ScheduleDeleteButton({ serviceId, dayOfWeek, label }: { serviceId: string; dayOfWeek: number; label: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteServiceScheduleAction(serviceId, dayOfWeek);
      if (result.ok) {
        setConfirming(false);
      }
    });
  }

  return (
    <>
      <button type="button" className="aicon-btn" onClick={() => setConfirming(true)} aria-label={`Eliminar horario ${label}`}>
        <Trash2 className="h-4 w-4" />
      </button>
      {confirming ? (
        <ConfirmDialog
          title="Eliminar horario"
          text={`Se quitará el horario de ${label}. Las franjas futuras dejarán de generarse para ese día.`}
          confirmLabel="Eliminar horario"
          pending={pending}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}

export function BlockFormHeader() {
  return (
    <p className="flex items-center gap-2 text-sm font-bold text-[#211a1d]">
      <CalendarPlus className="h-4 w-4 text-[#7a1f3d]" />
      Nuevo bloqueo
    </p>
  );
}
