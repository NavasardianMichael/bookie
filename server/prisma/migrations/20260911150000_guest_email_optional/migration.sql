-- Guest email is optional: name + phone is enough to deliver the service.
-- `guestEmail` stays on the row as a handle if a later feature reconciles a
-- guest who registers, but it is no longer part of `appointment_actor_present`.

ALTER TABLE "Appointment" DROP CONSTRAINT "appointment_actor_present";

ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_actor_present"
  CHECK (
    "consumerId" IS NOT NULL
    OR (
      "guestFirstName"   IS NOT NULL
      AND "guestLastName"    IS NOT NULL
      AND "guestPhoneNumber" IS NOT NULL
    )
  );
