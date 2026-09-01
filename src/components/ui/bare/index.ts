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
  AppDescriptionList,
  type AppDescriptionListItem,
  type AppDescriptionListProps,
} from './AppDescriptionList'
export { AppLink, type AppLinkTone, type AppLinkVariant } from './AppLink'
export { AppParagraph } from './AppParagraph'
export { AppText, type AppTextTag } from './AppText'
export { AppTime } from './AppTime'
export { AppTitle, type AppTitleLevel, type AppTitleSize } from './AppTitle'
export { JsonLd } from './JsonLd'
export { type TextSize, type TextTone } from './typography'
