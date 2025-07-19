import { Metadata } from 'next'

export type GenerateMetadata<T> = (args: T) => Promise<Metadata>
