-- Fold the split card/account fields (and any leftover `reference`) into one
-- `payToNumber`. Prefer an existing `payToNumber`; otherwise join the leftover
-- strings with " / ". Consumer rows never keep pay-to details.

UPDATE "Provider"
SET "paymentInfo" = (
  "paymentInfo" - 'cardNumber' - 'accountNumber' - 'reference'
) || CASE
  WHEN COALESCE(
    NULLIF(trim("paymentInfo"->>'payToNumber'), ''),
    NULLIF(concat_ws(
      ' / ',
      NULLIF(trim("paymentInfo"->>'cardNumber'), ''),
      NULLIF(trim("paymentInfo"->>'accountNumber'), ''),
      NULLIF(trim("paymentInfo"->>'reference'), '')
    ), '')
  ) IS NULL THEN '{}'::jsonb
  ELSE jsonb_build_object(
    'payToNumber',
    COALESCE(
      NULLIF(trim("paymentInfo"->>'payToNumber'), ''),
      NULLIF(concat_ws(
        ' / ',
        NULLIF(trim("paymentInfo"->>'cardNumber'), ''),
        NULLIF(trim("paymentInfo"->>'accountNumber'), ''),
        NULLIF(trim("paymentInfo"->>'reference'), '')
      ), '')
    )
  )
END
WHERE "paymentInfo" IS NOT NULL
  AND jsonb_typeof("paymentInfo") = 'object'
  AND (
    "paymentInfo" ? 'cardNumber'
    OR "paymentInfo" ? 'accountNumber'
    OR "paymentInfo" ? 'reference'
  );

UPDATE "Provider"
SET "draft" = jsonb_set(
  "draft",
  '{paymentInfo}',
  ("draft" -> 'paymentInfo') - 'cardNumber' - 'accountNumber' - 'reference'
  || CASE
    WHEN COALESCE(
      NULLIF(trim("draft" -> 'paymentInfo' ->> 'payToNumber'), ''),
      NULLIF(concat_ws(
        ' / ',
        NULLIF(trim("draft" -> 'paymentInfo' ->> 'cardNumber'), ''),
        NULLIF(trim("draft" -> 'paymentInfo' ->> 'accountNumber'), ''),
        NULLIF(trim("draft" -> 'paymentInfo' ->> 'reference'), '')
      ), '')
    ) IS NULL THEN '{}'::jsonb
    ELSE jsonb_build_object(
      'payToNumber',
      COALESCE(
        NULLIF(trim("draft" -> 'paymentInfo' ->> 'payToNumber'), ''),
        NULLIF(concat_ws(
          ' / ',
          NULLIF(trim("draft" -> 'paymentInfo' ->> 'cardNumber'), ''),
          NULLIF(trim("draft" -> 'paymentInfo' ->> 'accountNumber'), ''),
          NULLIF(trim("draft" -> 'paymentInfo' ->> 'reference'), '')
        ), '')
      )
    )
  END
)
WHERE "draft" -> 'paymentInfo' IS NOT NULL
  AND jsonb_typeof("draft" -> 'paymentInfo') = 'object'
  AND (
    "draft" -> 'paymentInfo' ? 'cardNumber'
    OR "draft" -> 'paymentInfo' ? 'accountNumber'
    OR "draft" -> 'paymentInfo' ? 'reference'
  );

UPDATE "Consumer"
SET "paymentInfo" = "paymentInfo" - 'reference' - 'cardNumber' - 'accountNumber' - 'payToNumber' - 'notes'
WHERE "paymentInfo" ? 'reference'
   OR "paymentInfo" ? 'cardNumber'
   OR "paymentInfo" ? 'accountNumber'
   OR "paymentInfo" ? 'payToNumber'
   OR "paymentInfo" ? 'notes';
