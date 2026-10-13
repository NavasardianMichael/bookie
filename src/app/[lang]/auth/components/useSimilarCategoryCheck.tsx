'use client'

import { ReactNode, useCallback, useState } from 'react'
import { findSimilarCategoriesAPI } from '@api/categories/main'
import { NamedCategory } from '@store/categories/single/types'
import { CategoryValue } from '@interfaces/auth'
import { reportError } from '@helpers/reportError'
import { SimilarCategoriesDialog } from './SimilarCategoriesDialog'

type Answer = { use: NamedCategory } | 'create' | 'cancel'

type Question = {
  name: string
  matches: NamedCategory[]
  answer: (answer: Answer) => void
}

type SimilarCategoryCheck = {
  /**
   * The Categories field after asking about each category being added whose name is already,
   * or nearly, taken — one at a time, in order. A "use the existing one" replaces that entry
   * (dropping it if the existing one is already chosen). `null` means the provider went back
   * to the form: submit nothing.
   */
  resolveCategories: (values: CategoryValue[] | undefined) => Promise<CategoryValue[] | null>
  /** A lookup is in flight — the submit button should show it. */
  isChecking: boolean
  /** Render it anywhere in the form's tree. */
  dialog: ReactNode
}

/**
 * The step between a valid provider form and its save, for categories — what
 * `useSimilarOrganizationCheck` is for the organization. Only entries added as new are looked
 * up (`GET /categories/similar`); picked ones already are existing categories.
 *
 * A failed lookup does not block the save. It is reported and the entry goes as typed; the
 * server's same-name backstop still keeps an exact duplicate out.
 *
 * `onResolved` lets the form show the outcome — its field becomes the resolved list.
 */
export const useSimilarCategoryCheck = (onResolved: (values: CategoryValue[]) => void): SimilarCategoryCheck => {
  const [question, setQuestion] = useState<Question | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const resolveCategories = useCallback<SimilarCategoryCheck['resolveCategories']>(
    async (values) => {
      const entries = values ?? []
      if (!entries.some((entry) => entry.isNew)) return entries

      const resolved: CategoryValue[] = []
      for (const entry of entries) {
        if (!entry.isNew) {
          resolved.push(entry)
          continue
        }

        setIsChecking(true)
        let matches: NamedCategory[] = []
        try {
          matches = await findSimilarCategoriesAPI({ name: entry.name })
        } catch (error) {
          reportError(error, 'useSimilarCategoryCheck:lookup')
        } finally {
          setIsChecking(false)
        }
        // Categories already in the list are not alternatives to themselves.
        const alternatives = matches.filter((match) => !entries.some((other) => other.id === match.id))
        if (!alternatives.length) {
          resolved.push(entry)
          continue
        }

        const answer = await new Promise<Answer>((settleWith) =>
          setQuestion({ name: entry.name, matches: alternatives, answer: settleWith })
        )
        if (answer === 'cancel') return null
        if (answer === 'create') resolved.push(entry)
        else if (!resolved.some((other) => other.id === answer.use.id)) {
          resolved.push({ id: answer.use.id, name: answer.use.name })
        }
      }

      onResolved(resolved)
      return resolved
    },
    [onResolved]
  )

  const settle = (answer: Answer) => {
    question?.answer(answer)
    setQuestion(null)
  }

  const dialog = question && (
    <SimilarCategoriesDialog
      name={question.name}
      matches={question.matches}
      onUseExisting={(category) => settle({ use: category })}
      onCreateNew={() => settle('create')}
      onCancel={() => settle('cancel')}
    />
  )

  return { resolveCategories, isChecking, dialog }
}
