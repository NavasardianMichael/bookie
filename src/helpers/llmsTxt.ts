/**
 * `/llms.txt` — a plain index of the site for language-model readers (llmstxt.org): a title,
 * a one-line summary, then a Markdown list of links. Here the list is every listed provider,
 * with what they do beside the link, so an answer engine can match "who offers X" without
 * crawling every page first.
 *
 * Pure: the route (`src/app/llms.txt/route.ts`) fetches and passes everything in.
 */

export type LlmsTxtSection = {
  title: string
  links: { name: string; url: string; note?: string }[]
}

/** Markdown link text cannot hold `[` `]`, and a newline would end the list item. */
const clean = (value: string): string => value.replace(/[[\]\r\n]+/g, ' ').trim()

export const buildLlmsTxt = ({
  title,
  summary,
  sections,
}: {
  title: string
  summary: string
  sections: readonly LlmsTxtSection[]
}): string => {
  const blocks = [
    `# ${clean(title)}`,
    `> ${clean(summary)}`,
    ...sections
      .filter((section) => section.links.length)
      .map((section) =>
        [
          `## ${clean(section.title)}`,
          ...section.links.map(({ name, url, note }) =>
            note?.trim() ? `- [${clean(name)}](${url}): ${clean(note)}` : `- [${clean(name)}](${url})`
          ),
        ].join('\n')
      ),
  ]
  return `${blocks.join('\n\n')}\n`
}
