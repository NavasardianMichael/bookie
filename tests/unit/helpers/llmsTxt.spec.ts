import { describe, expect, it } from 'vitest'
import { buildLlmsTxt } from '@helpers/llmsTxt'

describe('buildLlmsTxt', () => {
  it('writes the llmstxt.org shape: title, summary, then link sections', () => {
    expect(
      buildLlmsTxt({
        title: 'Bookie',
        summary: 'Book appointments.',
        sections: [
          {
            title: 'Providers',
            links: [
              { name: 'Anna', url: 'https://bookie.example/p/anna', note: 'Dentist — Cleaning' },
              { name: 'Ben', url: 'https://bookie.example/p/ben' },
            ],
          },
        ],
      })
    ).toBe(
      '# Bookie\n\n> Book appointments.\n\n## Providers\n- [Anna](https://bookie.example/p/anna): Dentist — Cleaning\n- [Ben](https://bookie.example/p/ben)\n'
    )
  })

  it('leaves out a section with no links', () => {
    expect(buildLlmsTxt({ title: 'Bookie', summary: 'x', sections: [{ title: 'Providers', links: [] }] })).not.toContain(
      '## Providers'
    )
  })

  // A provider's name is theirs to type: brackets would break the link, a newline the list.
  it('cannot be broken out of by a name', () => {
    const text = buildLlmsTxt({
      title: 'Bookie',
      summary: 'x',
      sections: [{ title: 'Providers', links: [{ name: 'Evil]\n# Injected', url: 'https://bookie.example/p/e' }] }],
    })
    expect(text).toContain('- [Evil # Injected](https://bookie.example/p/e)')
    expect(text.split('\n').filter((line) => line.startsWith('# '))).toHaveLength(1)
  })
})
