import { BookingDraft } from '@api/bookingImport/types'
import { DaySchedulePart, ServiceAvailability } from '@store/providers/profile/types'
import { Endpoint } from '@interfaces/api'
import { TimeFormat, WeekDay } from '@interfaces/schedule'

/**
 * The provider's AI assistant and the public page's. Mirrors `server/src/services/assistant.ts`
 * (`AssistantAction`, the proposal kinds) and the routes' wire shapes. Here rather than in a
 * store: the chats live inside their panel (`useAssistantChat`), their one owner.
 */

/**
 * One change the assistant proposes. Applied — after the provider's click — through the same
 * calls the settings tabs make (`useApplyAssistantProposal`); keep the two lists in step.
 */
/** What a booking action is about — copied by the server for the card; the apply uses `bookingId`. */
export type AssistantBookingSnapshot = { start: string; client: string; service: string }

export type AssistantAction =
  | { type: 'setWeeklyHours'; days: { day: WeekDay; ranges: DaySchedulePart[] }[] }
  | {
      type: 'setSpecialDates'
      /**
       * `open`: `ranges` are the day's hours. `closed`: closed all day when `ranges` is empty,
       * otherwise closed only for those ranges. Absent (older proposals): empty ranges closed,
       * otherwise open.
       */
      entries: { from: string; to: string; kind?: 'open' | 'closed'; ranges: DaySchedulePart[]; note?: string }[]
    }
  | { type: 'removeSpecialDates'; dates: string[] }
  | { type: 'setOnlineBooking'; enabled: boolean }
  | {
      type: 'createService'
      name: string
      durationMinutes: number
      price?: number
      currency?: string
      description?: string
      availability?: ServiceAvailability
    }
  | {
      type: 'updateService'
      serviceId: string
      serviceName?: string
      name?: string
      durationMinutes?: number
      price?: number | null
      currency?: string
      description?: string
      active?: boolean
      availability?: ServiceAvailability
    }
  | { type: 'deleteService'; serviceId: string; serviceName?: string }
  | { type: 'updateProfile'; fullName?: string; description?: string; address?: string }
  | { type: 'setBookingApproval'; enabled: boolean }
  | {
      type: 'setNotifications'
      newBooking?: boolean
      bookingChanges?: boolean
      appointmentReminders?: boolean
      appointmentReminderMinutes?: number
    }
  | { type: 'setClock'; timeZone?: string; timeFormat?: TimeFormat }
  | { type: 'updateSeo'; title?: string; description?: string; slug?: string }
  | { type: 'setCategories'; names: string[] }
  | { type: 'setListed'; enabled: boolean }
  | { type: 'decideBooking'; bookingId: string; decision: 'approve' | 'reject'; booking?: AssistantBookingSnapshot }
  | { type: 'cancelBooking'; bookingId: string; booking?: AssistantBookingSnapshot }
  | {
      type: 'rescheduleBooking'
      bookingId: string
      date: string
      time: string
      booking?: AssistantBookingSnapshot
    }
  | { type: 'setVisitorAssistant'; enabled: boolean }

export type AssistantActionType = AssistantAction['type']

/** What a stored message carries beside its words. */
export type AssistantProposal =
  | { kind: 'changes'; summary: string; actions: AssistantAction[] }
  | { kind: 'photo' }
  | { kind: 'photoImport'; drafts: BookingDraft[] }

export type AssistantProposalStatus = 'pending' | 'applied' | 'partial' | 'dismissed'

/** One action's result once a proposal is applied — what the chat shows and the model is told. */
export type AssistantActionOutcome = { type: AssistantActionType; ok: boolean; code?: number }

export type AssistantMessage = {
  id: string
  role: 'user' | 'model'
  text: string
  proposal: AssistantProposal | null
  proposalStatus: AssistantProposalStatus | null
  outcome: AssistantActionOutcome[] | { created: number } | null
  createdAt: string
}

/** One of the provider's chats. An empty `title` is a chat a diary photo started (named by the client). */
export type AssistantConversation = { id: string; title: string; createdAt: string; updatedAt: string }

/** Today's messages against the plan's allowance. `limit` `null` is unlimited, `0` not on the plan. */
export type AssistantUsage = { used: number; limit: number | null }

export type AssistantState = {
  /** The deployment has a Gemini key. */
  available: boolean
  /** The provider's plan includes the assistant. */
  included: boolean
  usage: AssistantUsage
  /** Newest activity first. A chat's messages come from `getAssistantConversationAPI`. */
  conversations: AssistantConversation[]
  visitor: VisitorAssistantSetting
}

export type VisitorAssistantSetting = { allowed: boolean; enabled: boolean }

export type GetAssistantAPI = Endpoint<{
  payload: void
  response: AssistantState
  processed: AssistantState
}>

export type AssistantConversationContent = { conversation: AssistantConversation; messages: AssistantMessage[] }

export type GetAssistantConversationAPI = Endpoint<{
  payload: { id: string }
  response: AssistantConversationContent
  processed: AssistantConversationContent
}>

export type DeleteAssistantConversationAPI = Endpoint<{
  payload: { id: string }
  response: { deleted: boolean }
  processed: void
}>

/** The provider's message, streamed back. Not an `Endpoint` — it answers as events, not one envelope. */
export type SendAssistantMessageHandlers = {
  /** The stored copy of the provider's message, and its chat — a new one when none was named. */
  onStart: (message: AssistantMessage, conversation: AssistantConversation) => void
  onText: (text: string) => void
  /** The stored reply; `dropped` counts proposed changes that could not be offered. */
  onDone: (result: {
    message: AssistantMessage
    dropped: number
    usage: AssistantUsage
    conversation: AssistantConversation
  }) => void
}

export type PostAssistantPhotoAPI = Endpoint<{
  /** Without `conversationId` the read starts a new chat. */
  payload: { note?: string; drafts: BookingDraft[]; conversationId?: string }
  response: AssistantConversationContent
  processed: AssistantConversationContent
}>

export type PatchAssistantMessageAPI = Endpoint<{
  payload: {
    id: string
    status: Exclude<AssistantProposalStatus, 'pending'>
    outcome?: AssistantMessage['outcome']
  }
  response: AssistantMessage
  processed: AssistantMessage
}>

export type PutVisitorAssistantAPI = Endpoint<{
  payload: { enabled: boolean }
  response: VisitorAssistantSetting
  processed: VisitorAssistantSetting
}>

/** One turn of a visitor's conversation, as the browser keeps it (localStorage). */
export type VisitorAssistantTurn = { role: 'user' | 'model'; text: string }
