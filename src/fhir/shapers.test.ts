import { describe, it, expect } from "vitest";
import {
  shapePatient,
  shapeAppointment,
  shapeCondition,
  shapeMedication,
  shapeObservation,
} from "./shapers.js";

describe("shapers", () => {
  it("shapePatient picks minimal demographics", () => {
    const shaped = shapePatient({
      resourceType: "Patient",
      id: "p1",
      name: [{ given: ["Ana"], family: "Rivera" }],
      birthDate: "1980-05-01",
      gender: "female",
      telecom: [{ system: "phone", value: "787-555-0100" }],
    });
    expect(shaped).toEqual({
      id: "p1",
      name: "Ana Rivera",
      birthDate: "1980-05-01",
      gender: "female",
      phone: "787-555-0100",
    });
  });

  it("shapeAppointment picks status/date/type and patient reference", () => {
    const shaped = shapeAppointment({
      resourceType: "Appointment",
      id: "a1",
      status: "booked",
      start: "2026-07-20T14:00:00Z",
      appointmentType: { text: "New patient" },
      participant: [{ actor: { reference: "Patient/p1", display: "Ana Rivera" } }],
    });
    expect(shaped).toEqual({
      id: "a1",
      status: "booked",
      start: "2026-07-20T14:00:00Z",
      type: "New patient",
      patient: "Ana Rivera",
    });
  });

  it("shapeCondition picks the display text", () => {
    expect(
      shapeCondition({
        resourceType: "Condition",
        id: "c1",
        code: { text: "Hypertension" },
        clinicalStatus: { coding: [{ code: "active" }] },
      }),
    ).toEqual({ id: "c1", condition: "Hypertension", status: "active" });
  });

  it("shapeMedication picks the medication display", () => {
    expect(
      shapeMedication({
        resourceType: "MedicationRequest",
        id: "m1",
        status: "active",
        medicationCodeableConcept: { text: "Lisinopril 10mg" },
      }),
    ).toEqual({ id: "m1", medication: "Lisinopril 10mg", status: "active" });
  });

  it("shapeObservation picks value + unit", () => {
    expect(
      shapeObservation({
        resourceType: "Observation",
        id: "o1",
        code: { text: "Glucose" },
        effectiveDateTime: "2026-07-01",
        valueQuantity: { value: 95, unit: "mg/dL" },
      }),
    ).toEqual({ id: "o1", test: "Glucose", value: "95 mg/dL", date: "2026-07-01" });
  });

  it("shapeObservation handles a quantity with no unit", () => {
    expect(
      shapeObservation({
        resourceType: "Observation",
        id: "o2",
        code: { text: "WBC" },
        effectiveDateTime: "2026-07-02",
        valueQuantity: { value: 5.2 },
      }),
    ).toEqual({ id: "o2", test: "WBC", value: "5.2", date: "2026-07-02" });
  });
});
