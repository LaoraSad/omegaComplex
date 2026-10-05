"use client";

import { TriangleAlert } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal compacto para acciones importantes o destructivas. */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  cancelLabel = "Cancelar",
  pending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="amodal-scrim" onClick={onCancel} role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
        className="amodal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="amodal-body space-y-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="akpi-icon"
              style={{ background: "#fdeef1", borderColor: "#f3cdd5", color: "#a1203a" }}
            >
              <TriangleAlert className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div>
              <h2 id="confirm-title" className="acard-title" style={{ fontSize: "1rem" }}>
                {title}
              </h2>
              <p id="confirm-text" className="acard-sub">
                {text}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="abtn abtn-secondary" onClick={onCancel} disabled={pending}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className="abtn abtn-danger"
              onClick={onConfirm}
              disabled={pending}
              autoFocus
            >
              {pending ? "Procesando…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
