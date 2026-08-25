/**
 * Barrel for the antd-free primitives only.
 *
 * antd v6 marks most of its `es/` modules `"use client"`, so anything wrapping an
 * antd component (AppButton, AppInput, AppFormItem, ErrorState) is a client
 * island. Re-exporting those here would pull antd's runtime into the client bundle
 * of any route that merely wants an AppTitle — import those from their own paths
 * instead.
 */

export * from './bare'
export * from './layout'
