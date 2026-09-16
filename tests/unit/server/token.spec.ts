import { describe, expect, it } from 'vitest'
import {
  isOwnerManageToken,
  mintOwnerManageToken,
  readOwnerManageAppointmentId,
} from '../../../server/src/lib/token'

const SECRET = 'test-secret'
const OTHER = 'other-secret'
const APPOINTMENT_ID = '11111111-1111-4111-8111-111111111111'

describe('owner manage tokens', () => {
  it('round-trips an appointment id', () => {
    const token = mintOwnerManageToken(APPOINTMENT_ID, SECRET)
    expect(isOwnerManageToken(token)).toBe(true)
    expect(readOwnerManageAppointmentId(token, SECRET)).toBe(APPOINTMENT_ID)
  })

  it('rejects a token minted with a different secret', () => {
    const token = mintOwnerManageToken(APPOINTMENT_ID, SECRET)
    expect(readOwnerManageAppointmentId(token, OTHER)).toBeNull()
  })

  it('rejects a tampered id', () => {
    const token = mintOwnerManageToken(APPOINTMENT_ID, SECRET)
    const tampered = token.replace(APPOINTMENT_ID, '22222222-2222-4222-8222-222222222222')
    expect(readOwnerManageAppointmentId(tampered, SECRET)).toBeNull()
  })

  it('ignores the emailed hex capability token shape', () => {
    expect(isOwnerManageToken('deadbeef'.repeat(8))).toBe(false)
    expect(readOwnerManageAppointmentId('deadbeef'.repeat(8), SECRET)).toBeNull()
  })
})
