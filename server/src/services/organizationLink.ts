import type { Prisma } from '@prisma/client'
import { findSameNamedOrganization, parseNewOrganization } from './organizations.js'
import { asTrimmedString } from '../lib/request.js'

/** The two shapes a request may name an organization in. */
export type OrganizationChoice = {
  organizationId?: unknown
  newOrganization?: unknown
}

/**
 * Resolves a provider's Organization section — at registration (email and Google) and from
 * the settings profile (`PATCH /provider-profile/organization`): `organizationId` links an
 * existing organization picked from the suggestions; `newOrganization` registers one with
 * the details its public page shows (`parseNewOrganization`), taking the provider's
 * `country`. Neither — or an id that no longer exists — resolves to `null`; registration
 * reads that as "no organization", which is how a sole trader registers.
 *
 * Before submitting, the web form looks up organizations with a similar name
 * (`GET /organizations/similar`) and asks the provider to join one or confirm a new one;
 * a confirmed draft carries `allowSimilar` and is always created. Without it, a draft whose
 * name matches an existing organization's — however cased, spaced or punctuated
 * (`findSameNamedOrganization`) — links that one and drops the details. That backstop is
 * load-bearing: the lookup can fail or race another registration, and re-registering an
 * unverified account resends the same draft, which must land on the organization the first
 * attempt created rather than a copy. An existing organization's details are never
 * overwritten from here.
 *
 * Takes the transaction client, so an organization is created only if the provider write
 * around it commits — a rolled-back registration must not leave a public organization
 * page behind.
 */
export const resolveOrganizationId = async (
  db: Prisma.TransactionClient,
  choice: OrganizationChoice,
  country: string | undefined
): Promise<string | null> => {
  const organizationId = asTrimmedString(choice.organizationId)
  if (organizationId) {
    const existing = await db.organization.findUnique({ where: { id: organizationId }, select: { id: true } })
    if (existing) return existing.id
  }

  const draft = parseNewOrganization(choice.newOrganization, country)
  if (!draft) return null

  if (!draft.allowSimilar) {
    const names = await db.organization.findMany({ select: { id: true, name: true } })
    const matched = findSameNamedOrganization(names, draft.data.name)
    if (matched) return matched.id
  }

  const created = await db.organization.create({ data: draft.data, select: { id: true } })
  return created.id
}
