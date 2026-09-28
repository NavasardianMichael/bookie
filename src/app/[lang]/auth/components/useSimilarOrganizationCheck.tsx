'use client'

import { ReactNode, useCallback, useState } from 'react'
import { findSimilarOrganizationsAPI } from '@api/organizations/main'
import { BasicOrganization } from '@store/organizations/single/types'
import { NewOrganizationFormValues, OrganizationValue, RegistrationProfile } from '@interfaces/auth'
import { toOrganizationFields } from '@helpers/registration'
import { reportError } from '@helpers/reportError'
import { SimilarOrganizationsDialog } from './SimilarOrganizationsDialog'

export type OrganizationFields = Pick<RegistrationProfile, 'organizationId' | 'newOrganization'>

type Question = {
  fields: OrganizationFields & { newOrganization: NonNullable<OrganizationFields['newOrganization']> }
  matches: BasicOrganization[]
  answer: (fields: OrganizationFields | null) => void
}

type SimilarOrganizationCheck = {
  /**
   * The Organization section as registration payload fields — after asking, when a new
   * organization's name is already or nearly taken. `null` means the provider went back to
   * the form: submit nothing.
   */
  resolveOrganization: (
    value: OrganizationValue | undefined,
    details: NewOrganizationFormValues | undefined
  ) => Promise<OrganizationFields | null>
  /** The lookup is in flight — the submit button should show it. */
  isChecking: boolean
  /** Render it anywhere in the form's tree. */
  dialog: ReactNode
}

/**
 * The step between a valid registration form and `register()`: a new organization's name
 * is looked up (`GET /organizations/similar`), and if anything comes back the provider
 * chooses — join an existing one, or create theirs anyway (`allowSimilar`). An existing
 * organization picked from the suggestions skips the lookup.
 *
 * A failed lookup does not block registration. It is reported and the draft goes as it is;
 * the server's same-name backstop still keeps an exact duplicate out.
 *
 * `onLinkExisting` lets the form show the choice — the name field becomes the picked
 * organization, and the new-organization fields fold away.
 */
export const useSimilarOrganizationCheck = (
  onLinkExisting: (organization: BasicOrganization) => void
): SimilarOrganizationCheck => {
  const [question, setQuestion] = useState<Question | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const resolveOrganization = useCallback<SimilarOrganizationCheck['resolveOrganization']>(async (value, details) => {
    const fields = toOrganizationFields(value, details)
    const { newOrganization } = fields
    if (!newOrganization) return fields

    setIsChecking(true)
    let matches: BasicOrganization[] = []
    try {
      matches = await findSimilarOrganizationsAPI({ name: newOrganization.name })
    } catch (error) {
      reportError(error, 'useSimilarOrganizationCheck:lookup')
    } finally {
      setIsChecking(false)
    }
    if (!matches.length) return fields

    return new Promise<OrganizationFields | null>((answer) => {
      setQuestion({ fields: { ...fields, newOrganization }, matches, answer })
    })
  }, [])

  const settle = (fields: OrganizationFields | null) => {
    question?.answer(fields)
    setQuestion(null)
  }

  const dialog = question && (
    <SimilarOrganizationsDialog
      name={question.fields.newOrganization.name}
      matches={question.matches}
      onUseExisting={(organization) => {
        onLinkExisting(organization)
        settle({ organizationId: organization.id })
      }}
      onCreateNew={() => settle({ newOrganization: { ...question.fields.newOrganization, allowSimilar: true } })}
      onCancel={() => settle(null)}
    />
  )

  return { resolveOrganization, isChecking, dialog }
}
