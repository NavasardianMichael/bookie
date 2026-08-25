/**
 * Bare primitives: one HTML element each, no antd, no hooks, no browser API.
 *
 * antd v6 marks most of its `es/` modules `"use client"`, so every antd wrapper is
 * a client island whose text only reaches the HTML through hydration. These render
 * in any Server Component, which is what puts headings, copy and anchors in the
 * markup a crawler or an LLM reader actually sees.
 *
 * Keep this folder antd-free. Anything that imports antd belongs in `ui/` proper.
 */

export {
  default as AppDescriptionList,
  type AppDescriptionListItem,
  type AppDescriptionListProps,
} from './AppDescriptionList'
export { default as AppLink, type AppLinkTone, type AppLinkVariant } from './AppLink'
export { default as AppParagraph } from './AppParagraph'
export { default as AppText, type AppTextTag } from './AppText'
export { default as AppTime } from './AppTime'
export { default as AppTitle, type AppTitleLevel, type AppTitleSize } from './AppTitle'
export { default as JsonLd } from './JsonLd'
export { type TextSize, type TextTone } from './typography'
