-- Move the leftover single `reference` string onto `accountNumber` so existing
-- provider rows keep showing what they typed. Guarded on `? 'reference'` and the
-- absence of `accountNumber` so a re-run is a no-op. Consumer rows never kept
-- this field in the live UI; strip it there so it cannot linger.
UPDATE "Provider"
SET "paymentInfo" = ("paymentInfo" - 'reference')
  || jsonb_build_object('accountNumber', "paymentInfo" -> 'reference')
WHERE "paymentInfo" ? 'reference'
  AND NOT ("paymentInfo" ? 'accountNumber');

UPDATE "Provider"
SET "draft" = jsonb_set(
  "draft",
  '{paymentInfo}',
  ("draft" -> 'paymentInfo') - 'reference'
    || jsonb_build_object('accountNumber', "draft" -> 'paymentInfo' -> 'reference')
)
WHERE "draft" -> 'paymentInfo' ? 'reference'
  AND NOT ("draft" -> 'paymentInfo' ? 'accountNumber');

UPDATE "Consumer"
SET "paymentInfo" = "paymentInfo" - 'reference' - 'cardNumber' - 'accountNumber' - 'notes'
WHERE "paymentInfo" ? 'reference'
   OR "paymentInfo" ? 'cardNumber'
   OR "paymentInfo" ? 'accountNumber'
   OR "paymentInfo" ? 'notes';
