import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { BRAND } from '@styles/tokens'

/**
 * Next lists `app/favicon.ico` ahead of `icon.tsx`, so the tab paints this file.
 * It is the Bookie mark in the primary navy on a transparent ground. The filled
 * tile in `icon.tsx` is the install icon, not the tab.
 */
const ico = readFileSync(join(process.cwd(), 'src/app/favicon.ico'))

const brand = BRAND[900]
  .slice(1)
  .match(/../g)!
  .map((hex) => Number.parseInt(hex, 16))

const paeth = (left: number, up: number, upLeft: number): number => {
  const estimate = left + up - upLeft
  const leftDistance = Math.abs(estimate - left)
  const upDistance = Math.abs(estimate - up)
  const upLeftDistance = Math.abs(estimate - upLeft)
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left
  return upDistance <= upLeftDistance ? up : upLeft
}

/** How the frame is inked: clear corner, primary strokes, and any light pixels (the old white mark). */
const frameInk = (png: Buffer): { transparentCorner: boolean; clear: number; primary: number; light: number } => {
  let offset = 8
  let width = 0
  let colorType = 0
  const idat: Buffer[] = []

  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const data = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }

  const channels = colorType === 6 ? 4 : 3
  const inflated = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  let index = 0
  let previous = Buffer.alloc(stride)
  let clear = 0
  let primary = 0
  let light = 0
  let cornerAlpha = 255

  const height = inflated.length / (stride + 1)
  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filter = inflated[index]
    index += 1
    const row = Buffer.from(inflated.subarray(index, index + stride))
    index += stride
    for (let column = 0; column < stride; column += 1) {
      const left = column >= channels ? row[column - channels] : 0
      const up = previous[column]
      const upLeft = column >= channels ? previous[column - channels] : 0
      const predicted =
        filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upLeft) : 0
      row[column] = (row[column] + predicted) & 255
    }
    previous = row

    for (let x = 0; x < width; x += 1) {
      const pixel = x * channels
      const alpha = channels === 4 ? row[pixel + 3] : 255
      if (rowIndex === 0 && x === 0) cornerAlpha = alpha
      if (alpha < 16) {
        clear += 1
        continue
      }
      const [red, green, blue] = [row[pixel], row[pixel + 1], row[pixel + 2]]
      if (red === brand[0] && green === brand[1] && blue === brand[2]) primary += 1
      if (red > 200 && green > 200 && blue > 200) light += 1
    }
  }

  return { transparentCorner: cornerAlpha === 0, clear, primary, light }
}

const frames = (): { width: number; png: Buffer }[] => {
  const count = ico.readUInt16LE(4)
  return Array.from({ length: count }, (_, index) => {
    const entry = 6 + index * 16
    const width = ico[entry] || 256
    const length = ico.readUInt32LE(entry + 8)
    const start = ico.readUInt32LE(entry + 12)
    return { width, png: ico.subarray(start, start + length) }
  })
}

describe('favicon.ico', () => {
  it('draws the primary mark on a transparent ground', () => {
    const images = frames()

    expect(images.map((image) => image.width)).toEqual([48, 32, 16])

    for (const image of images) {
      expect(image.png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      const ink = frameInk(image.png)
      expect(ink.transparentCorner).toBe(true)
      expect(ink.clear).toBeGreaterThan(ink.primary)
      expect(ink.primary).toBeGreaterThan(0)
      expect(ink.light).toBe(0)
    }
  })
})
