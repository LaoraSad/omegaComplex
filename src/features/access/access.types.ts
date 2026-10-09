// ---------------------------------------------------------------------------
// Control de acceso (SCRUM secciones 15 a 19).
// El empleado escanea un QR, el sistema lo valida y el empleado confirma
// el ingreso. Nunca se otorga acceso automático (sección 19).
//
// Las manillas las lleva el complejo por su cuenta y no se registran aqui.
// ---------------------------------------------------------------------------

/** Motivos de denegación. Cada uno responde a una validación de la sección 16. */
export type DenialCode =
  | "qr_invalido"
  | "reserva_inexistente"
  | "reserva_no_confirmada"
  | "qr_ya_utilizado"
  | "qr_expirado"
  | "fecha_distinta"
  | "franja_terminada"
  | "franja_no_iniciada"
  | "acceso_ya_registrado"
  | "empleado_inactivo"
  | "empleado_sin_zona";

export type DenialReason = {
  code: DenialCode;
  /** Mensaje listo para mostrar al empleado. */
  message: string;
};

/** Instalación a la que pertenece la reserva, para contrastar con la zona del empleado. */
export type ZoneInfo = {
  serviceId: string;
  serviceName: string;
  categoryName: string;
};

export type ReservationSummary = {
  reservationId: string;
  seqNo: number;
  qrStatus: string;
  status: string;
  channel: string;
  quantity: number;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerDocument: string | null;
  zone: ZoneInfo;
};

/** Respuesta de la consulta: el empleado ve la ficha antes de dar acceso. */
export type AccessLookup = {
  outcome: "allowed" | "denied";
  /** Solo cuando outcome es "allowed". */
  reservation?: ReservationSummary;
  /** Siempre presente: permite al empleado ver la razón aunque se deniegue. */
  denial?: DenialReason;
  /**
   * La reserva es válida pero la zona no está entre las del empleado.
   * La respuesta 37 dice que el empleado debe acompañarlo, no denegar,
   * así que se informa en vez de bloquear.
   */
  outsideEmployeeZone?: { reservationZone: ZoneInfo; employeeZones: ZoneInfo[] };
};

/** Resultado de registrar el ingreso. */
export type AccessGrant = {
  accessId: string;
  accessedAt: Date;
  customerName: string;
  zone: ZoneInfo;
};