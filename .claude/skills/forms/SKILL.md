---
name: forms
description: Build or edit a form in this repo. Ant Design Form is the single source of truth for form state and validation; Formik is legacy and being removed. Covers the control contract custom field components must implement, validation rules via useFormItemRules, and the four live bugs the old dual-binding causes. Use for any work on ProviderProfileForm, ProviderServiceForm, the auth forms, or any new form.
---

# Forms

**Ant Design `Form` owns form state and validation. Do not add Formik.**

Some components still carry the old Formik + antd dual binding. That is not a style
preference being cleaned up — it is actively broken, and the migration is tracked in
`docs/BACKLOG.md`. Read *Why the dual binding breaks* below before touching one.

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

It composes only — it cannot parameterise (`max: 60`) or express a custom `validator`.
For those, write the rule array inline.

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

Two sources of truth, each authoritative for a different half. Four live consequences:

| Where | Effect |
|---|---|
| `ProviderProfileForm.tsx:88` | `categoryIds` has `required` + `min:1` on an antd slot nothing writes → **the form can never be submitted** |
| `ProviderProfileFormOrganization.tsx:36` | Writes `organization`; the payload builder reads `organizationId`. Never submitted |
| `ProviderServiceFormCategory.tsx:28` | `value.id` where `value` is a string → `undefined` |
| `AccountTypeButtons.tsx:39` | Shows "Client" selected while Formik holds `provider` |

Removing Formik fixes all four by construction.

## Migrating a form

1. Delete `useFormik`; add `const [form] = Form.useForm<Values>()` if absent.
2. Move `initialValues` onto `<Form initialValues={…}>`.
3. Strip every `value` / `onChange` / `disabled={formik.isSubmitting}` from fields.
4. Rewrite each custom field component to the control contract above, dropping its
   `formik` and `form` props.
5. `onFinish={handleFinish}` where `handleFinish(values)` uses its argument.
6. Replace `formik.isSubmitting` with local state or the store's `isPending`.
7. Delete the now-unused `AppFormProps<T>` import from `src/interfaces/forms.ts`.
8. Check field names line up end to end: `Form.Item name` → the values key → what the
   processor in `processors.ts` reads. Bug #2 is exactly this drift.

Verify by actually submitting the form against a running API — for the provider profile
form, a successful save *is* the regression test, since it cannot currently submit at all.

## Out of scope

`OTPCodeInput.tsx` uses neither system: plain `useState`, and its `Form.Item` is nameless
and outside any `<Form>`, so `OTPCodeValidationRules` is dead code and the server OTP
error never surfaces through it. Fix it deliberately, not as a side effect.
