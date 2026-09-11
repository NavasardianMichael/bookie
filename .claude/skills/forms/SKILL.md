---
name: forms
description: Build or edit a form in this repo. Ant Design Form is the single source of truth for form state and validation; Formik has been removed. Covers the control contract custom field components must implement, validation rules via useFormItemRules, and why the old dual binding broke. Use for any work on ProviderProfileForm, ProviderServiceForm, the auth forms, or any new form.
---

# Forms

**Ant Design `Form` owns form state and validation. Formik is gone — do not add it back.**

Every form in `src/` is antd-only as of 2026-09-11; `formik` is not a dependency and
`src/interfaces/forms.ts` no longer exists. *Why the dual binding breaks* below is kept
because it explains the failure mode, and because it is what a reviewer needs when someone
proposes a second form library.

## The pattern

```tsx
'use client'

const ProviderProfileForm: React.FC<Props> = ({ initialValues = DEFAULTS }) => {
  const [form] = Form.useForm<ProviderProfileFormValues>()
  const putProviderProfileData = useProviderProfileStore.use.putProviderProfileData()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requiredText = useFormItemRules('required', 'maxCharsForInput')

  const handleFinish = async (values: ProviderProfileFormValues) => {
    setIsSubmitting(true)
    try {
      await putProviderProfileData(processProviderProfileFormToPostPayload(values))
      push(ROUTES.providerServices)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form
      form={form}
      initialValues={initialValues}
      layout='vertical'
      onFinish={handleFinish}
      scrollToFirstError
      className='flex w-full flex-col gap-6'
    >
      <AppFormSection title='About you'>
        <AppFormItem name='firstName' label='First Name' rules={requiredText}>
          <AppInput autoComplete='given-name' enterKeyHint='next' />
        </AppFormItem>
      </AppFormSection>

      <AppButton htmlType='submit' type='primary' loading={isSubmitting}>Save</AppButton>
    </Form>
  )
}
```

Four things to notice:

1. **No `value` / `onChange` on the field.** antd injects them. Passing your own is the
   root of every bug below — antd's store value *overrides* yours.
2. **`initialValues` goes on `<Form>`**, not into some parallel state. This is what makes
   edit mode work.
3. **`onFinish` receives the values.** Use its argument. Don't reach for another store.
4. **Spacing comes from the parent flex `gap`** — `theme.ts` sets `Form.itemMarginBottom: 0`.
   Never add `mb-*!` classes.

## Custom field components must implement the control contract

This is the single most important rule. A component used as the direct child of a named
`Form.Item` **must accept `value` and `onChange`**, or antd's injected props land nowhere
and the store slot for that field is never written:

```tsx
type Props = {
  value?: Category['id'][]      // injected by Form.Item
  onChange?: (next: Category['id'][]) => void
}

const ProviderProfileFormCategories: FC<Props> = ({ value = [], onChange }) => (
  <Select mode='tags' value={value} onChange={onChange} maxCount={3} />
)
```

Used as:

```tsx
<AppFormItem name='categoryIds' label='Categories' rules={oneItemAtLeast}>
  <ProviderProfileFormCategories />
</AppFormItem>
```

A component that destructures only its own props and ignores `value`/`onChange` **silently
drops them**. A thin antd wrapper like `AppInput` works because it spreads `...props`
onto the real `Input`.

Corollary: **never wrap the real control in a layout element inside `Form.Item`.** If
`AppFormItem name='address'` wraps a `<Flex>`, antd clones the `Flex` and lands
`value`/`onChange` on its `<div>`.

## Validation

Rules come from `useFormItemRules(...names)`, backed by `FORM_ITEM_RULES` in
`src/constants/form.ts`: `required`, `maxCharsForInput` (40), `maxCharsForTextarea` (300),
`oneItemSelectedAtLeast`, `email`, `positiveNumber`, `url`.

A textarea that uses `maxCharsForTextarea` must also pass `maxLength={MAX_CHARS_FOR_TEXTAREA}`
on `AppTextArea` — that is what draws the `12/300` crumb. `maxLength` without a matching
rule (or the reverse) desyncs the counter from validation.

It composes only — it cannot parameterise (`max: 60`) or express a custom `validator`.
For those, write the rule array inline.

**When a rule set mirrors a server policy, extract it.** `usePasswordRules`
(`src/hooks/usePasswordRules.ts`) exists because the auth screens originally checked only
the password's length while `validatePassword` on the server also requires a letter **and**
a digit and forbids the email's local part — so a password the server rejected passed
client validation, submitted, and returned an error the form had never warned about. **A
partial mirror is worse than none.** One hook, matching the server rule for rule, is the
shape to copy for any other policy that lives on both sides.

The `required` message uses `${label}`, an antd `messageVariables` template. It resolves
because `AppFormItem` injects `messageVariables={{ label }}`. **A raw `Form.Item` must
supply that itself**, which is why the phone form hand-writes
`messageVariables={{ label: 'Country Code' }}`.

Two gotchas:

- **`AppFormItem` hardcodes `validateTrigger='onChange'` (debounced 300ms), which
  overrides `<Form validateTrigger='onSubmit'>`.** Field-level always wins
  (`mergedValidateTrigger = validateTrigger ?? fieldContext.validateTrigger`). Setting it
  on `<Form>` is inert; set it per field or change `AppFormItem`.
- `useFormItemRules` memoises on an **empty dep array**, with an eslint-disable. Fine for
  literal call sites; a dynamic one silently returns stale rules.

## Reset

`form.resetFields()` — and if a sheet or modal hosts the form, reset on close, not only
on submit. Stale antd values *and* stale error state otherwise survive into the next open.

## Why the dual binding breaks

`@rc-component/form/es/Field.js` clones the child with
`{ ...childProps, ...valueProps }`, where `valueProps` is antd's store value. So for any
named `Form.Item`:

- **antd's store value wins the render**, overriding `value={formik.values.x}`
- **Formik wins the submit**, because `onFinish={formik.handleSubmit}` ignores the values
  antd hands it

Two sources of truth, each authoritative for a different half. That produced four real
bugs, all now fixed by construction — they are worth knowing because **each was invisible**:
no type error, no validation error, no failed request.

| Where | Effect |
|---|---|
| `ProviderProfileForm` | `categoryIds` carried `required` + `min:1` on an antd slot nothing wrote → **the form could not be submitted at all** |
| `ProviderProfileFormOrganization` | Wrote `organization`; the payload builder read `organizationId`, so the selection was silently never submitted |
| `ProviderServiceFormCategory` | Read `value.id` off a string and stored `undefined` |
| `AccountTypeButtons` | Gone — the account-type screen is two links, so there is no selection state to disagree about |

Two worked examples to copy: `src/components/providerServiceForm/` (three custom fields, a
parent that picks POST vs PUT off `values.id`) and `src/components/providerProfileForm/`
(six custom fields, including two that hold `File`s and one that owns the whole week
schedule).

Field-name drift is the one that survives a refactor, so it is pinned by a test rather than
a comment — see `tests/unit/components/providerProfileForm.processors.spec.ts`.

## Migrating a form

1. Delete `useFormik`; add `const [form] = Form.useForm<Values>()` if absent.
2. Move `initialValues` onto `<Form initialValues={…}>`.
3. Strip every `value` / `onChange` / `disabled={formik.isSubmitting}` from fields.
4. Rewrite each custom field component to the control contract above, dropping its
   `formik` and `form` props.
5. `onFinish={handleFinish}` where `handleFinish(values)` uses its argument.
6. Replace `formik.isSubmitting` with local state or the store's `isPending`.
7. Check field names line up end to end: `Form.Item name` → the values key → what the
   processor in `processors.ts` reads. Bug #2 was exactly this drift, and nothing in the
   type system catches it — add a processor test.
8. Derive previews from `value`; never mirror into state inside an effect.
   `react-hooks/set-state-in-effect` is an **error** here.

Verify by actually submitting against a running API. `pnpm typecheck` cannot see any of
these failure modes.

## A control that holds a `File`

`ProviderServiceFormImage` and `ProfilePhotoField` are the shape to copy. The field's value
is a `File` between the crop and the save and the stored `/uploads/...` path afterwards, so:

- widen the form-values type to `string | File`, and let the API layer decide the transport
  — it sends JSON unless the value is really a `File`;
- derive the preview from `value` rather than mirroring it into `useState`, and revoke the
  blob URL when `value` moves on, or the crop leaks;
- give `Upload` a no-op `customRequest`, so antd does not POST the file on its own.
  **Not** `beforeUpload={() => false}`: `antd-img-crop` resolves its crop promise with
  whatever `beforeUpload` returned and passes *that* to `onModalOk`, so `false` arrives
  where the cropped `File` was expected and the image is silently dropped.
- put the control in a **named** `Form.Item`. `setFieldValue('image', file)` on a name
  with no item is dropped by `validateFields()`, so Save draft sends no file and the
  live portrait comes back.

## Out of scope

`OTPCodeInput.tsx` uses neither system: plain `useState`, and its `Form.Item` is nameless
and outside any `<Form>`, so `OTPCodeValidationRules` is dead code and the server OTP
error never surfaces through it. Fix it deliberately, not as a side effect.
