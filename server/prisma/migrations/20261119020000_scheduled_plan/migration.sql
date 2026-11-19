-- A move to a cheaper plan waits for the end of the paid period (docs/BILLING.md → Moving down).
ALTER TABLE "Provider" ADD COLUMN "scheduledPlan" "Plan",
ADD COLUMN "scheduledPlanAt" TIMESTAMP(3);
