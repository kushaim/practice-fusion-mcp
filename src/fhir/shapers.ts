import type { FhirResource } from "./client.js";

type Any = Record<string, any>;

export interface ShapedPatient {
  id?: string;
  name: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
}

export function shapePatient(r: FhirResource): ShapedPatient {
  const n = (r as Any).name?.[0];
  const name = n ? [n.given?.join(" "), n.family].filter(Boolean).join(" ") : "(unknown)";
  const phone = (r as Any).telecom?.find((t: Any) => t.system === "phone")?.value;
  return { id: r.id, name, birthDate: (r as Any).birthDate, gender: (r as Any).gender, phone };
}

export function shapeAppointment(r: FhirResource) {
  const a = r as Any;
  const patient = a.participant?.find((p: Any) => p.actor?.reference?.startsWith("Patient/"))?.actor
    ?.display;
  return {
    id: r.id,
    status: a.status,
    start: a.start,
    type: a.appointmentType?.text,
    patient,
  };
}

export function shapeCondition(r: FhirResource) {
  const c = r as Any;
  return {
    id: r.id,
    condition: c.code?.text,
    status: c.clinicalStatus?.coding?.[0]?.code,
  };
}

export function shapeMedication(r: FhirResource) {
  const m = r as Any;
  return {
    id: r.id,
    medication: m.medicationCodeableConcept?.text,
    status: m.status,
  };
}

export function shapeObservation(r: FhirResource) {
  const o = r as Any;
  const q = o.valueQuantity;
  return {
    id: r.id,
    test: o.code?.text,
    value: q ? `${q.value} ${q.unit}`.trim() : o.valueString,
    date: o.effectiveDateTime,
  };
}
