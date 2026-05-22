#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const APP_URL = process.env.APP_URL ?? 'http://localhost:8000'
const HEADLESS = process.env.HEADLESS !== '0'
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 60_000)

const DOM_HELPERS = String.raw`
  const normalizeText = (value) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  const textOf = (el) => String(el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim()
  const enabledControls = () =>
    Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .filter((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true')
  const findControl = (needle) => {
    const wanted = normalizeText(needle)
    return enabledControls().find((el) => normalizeText(textOf(el)).includes(wanted)) || null
  }
  const clickControl = (needle) => {
    const el = findControl(needle)
    if (!el) return false
    el.scrollIntoView({ block: 'center', inline: 'center' })
    el.click()
    return true
  }
  const setInputValue = (selector, value) => {
    const input = document.querySelector(selector)
    if (!input) return false
    input.focus()
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }
  const roomCodeFromPage = () => {
    const matches = Array.from(document.body.innerText.matchAll(/[A-Z2-9]{6}/g)).map((m) => m[0])
    return matches.find((code) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) || null
  }
  const squarePiece = (square) => {
    const piece = document.querySelector('[data-square="' + square + '"] .chess-piece')
    if (!piece) return null
    return {
      text: piece.textContent || '',
      className: piece.className || '',
    }
  }
  const dragSquare = async (from, to, pointerType = 'mouse') => {
    const fromSquare = document.querySelector('[data-square="' + from + '"]')
    const toSquare = document.querySelector('[data-square="' + to + '"]')
    const piece = fromSquare?.querySelector('.chess-piece-draggable') || fromSquare?.querySelector('.chess-piece')
    if (!fromSquare || !toSquare || !piece) return false

    const a = fromSquare.getBoundingClientRect()
    const b = toSquare.getBoundingClientRect()
    const ax = a.left + a.width / 2
    const ay = a.top + a.height / 2
    const bx = b.left + b.width / 2
    const by = b.top + b.height / 2
    const pointerId = 7701
    const fire = (target, type, x, y, buttons) => {
      const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType,
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
      })
      target.dispatchEvent(event)
    }

    fire(piece, 'pointerdown', ax, ay, 1)
    await new Promise((resolve) => setTimeout(resolve, 80))
    fire(document, 'pointermove', ax + (bx - ax) * 0.45, ay + (by - ay) * 0.45, 1)
    await new Promise((resolve) => setTimeout(resolve, 60))
    fire(document, 'pointermove', bx, by, 1)
    await new Promise((resolve) => setTimeout(resolve, 60))
    fire(document, 'pointerup', bx, by, 0)
    return true
  }
`

class MiniWebSocket {
  constructor(wsUrl) {
    this.url = new URL(wsUrl)
    this.buffer = Buffer.alloc(0)
    this.handshaken = false
    this.handlers = new Set()
    this.socket = null
  }

  connect() {
    return new Promise((resolve, reject) => {
      const key = randomBytes(16).toString('base64')
      const port = Number(this.url.port || 80)
      this.socket = net.createConnection({ host: this.url.hostname, port }, () => {
        this.socket.write(
          [
            `GET ${this.url.pathname}${this.url.search} HTTP/1.1`,
            `Host: ${this.url.host}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${key}`,
            'Sec-WebSocket-Version: 13',
            '',
            '',
          ].join('\r\n'),
        )
      })

      const onError = (error) => {
        reject(error)
      }

      this.socket.once('error', onError)
      this.socket.on('data', (chunk) => {
        this.buffer = Buffer.concat([this.buffer, chunk])

        if (!this.handshaken) {
          const split = this.buffer.indexOf('\r\n\r\n')
          if (split === -1) return

          const headers = this.buffer.slice(0, split).toString('utf8')
          if (!headers.includes('101')) {
            reject(new Error(`WebSocket handshake failed: ${headers.split('\r\n')[0]}`))
            return
          }

          this.socket.off('error', onError)
          this.handshaken = true
          this.buffer = this.buffer.slice(split + 4)
          resolve()
        }

        this.readFrames()
      })
    })
  }

  onMessage(handler) {
    this.handlers.add(handler)
  }

  sendText(text, opcode = 0x1) {
    const payload = Buffer.from(text)
    const mask = randomBytes(4)
    let header

    if (payload.length < 126) {
      header = Buffer.alloc(2)
      header[1] = payload.length | 0x80
    } else if (payload.length < 65_536) {
      header = Buffer.alloc(4)
      header[1] = 126 | 0x80
      header.writeUInt16BE(payload.length, 2)
    } else {
      header = Buffer.alloc(10)
      header[1] = 127 | 0x80
      header.writeBigUInt64BE(BigInt(payload.length), 2)
    }

    header[0] = 0x80 | opcode
    const masked = Buffer.alloc(payload.length)
    for (let i = 0; i < payload.length; i++) {
      masked[i] = payload[i] ^ mask[i % 4]
    }

    this.socket.write(Buffer.concat([header, mask, masked]))
  }

  readFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0]
      const second = this.buffer[1]
      const opcode = first & 0x0f
      const masked = Boolean(second & 0x80)
      let length = second & 0x7f
      let offset = 2

      if (length === 126) {
        if (this.buffer.length < offset + 2) return
        length = this.buffer.readUInt16BE(offset)
        offset += 2
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return
        length = Number(this.buffer.readBigUInt64BE(offset))
        offset += 8
      }

      const maskOffset = masked ? 4 : 0
      if (this.buffer.length < offset + maskOffset + length) return

      let payload = this.buffer.slice(offset + maskOffset, offset + maskOffset + length)
      if (masked) {
        const mask = this.buffer.slice(offset, offset + 4)
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]))
      }
      this.buffer = this.buffer.slice(offset + maskOffset + length)

      if (opcode === 0x1 || opcode === 0x0) {
        const message = payload.toString('utf8')
        for (const handler of this.handlers) handler(message)
      } else if (opcode === 0x8) {
        this.close()
      } else if (opcode === 0x9) {
        this.sendText(payload.toString('utf8'), 0xA)
      }
    }
  }

  close() {
    this.socket?.destroy()
  }
}

class CdpPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.seq = 0
    this.pending = new Map()
    this.ws = new MiniWebSocket(wsUrl)
  }

  async connect() {
    await this.ws.connect()
    this.ws.onMessage((message) => {
      const payload = JSON.parse(message)
      if (!payload.id) return
      const item = this.pending.get(payload.id)
      if (!item) return
      this.pending.delete(payload.id)
      if (payload.error) item.reject(new Error(payload.error.message))
      else item.resolve(payload.result)
    })
    await this.send('Runtime.enable')
  }

  send(method, params = {}) {
    const id = ++this.seq
    const message = JSON.stringify({ id, method, params })
    this.ws.sendText(message)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`CDP timeout: ${method}`))
      }, TIMEOUT_MS)

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
    })
  }

  async evaluate(source) {
    const result = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${DOM_HELPERS}\n${source} })()`,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    })

    if (result.exceptionDetails) {
      const message =
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        'Runtime evaluation failed'
      throw new Error(message)
    }
    return result.result?.value
  }

  close() {
    this.ws.close()
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean)

  return candidates.find((candidate) => existsSync(candidate)) || null
}

async function waitForDevTools(port) {
  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {
      // keep waiting
    }
    await sleep(100)
  }
  throw new Error(`Chrome DevTools did not open on port ${port}`)
}

async function openPage(port, url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT',
  })
  if (!response.ok) throw new Error(`Could not open target: HTTP ${response.status}`)
  const target = await response.json()
  const page = new CdpPage(target.webSocketDebuggerUrl)
  await page.connect()
  return page
}

async function launchBrowser(label, chromePath, url) {
  const port = await getFreePort()
  const profile = await mkdtemp(join(tmpdir(), `gdd-${label}-`))
  const args = [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--disable-sync',
    '--disable-dev-shm-usage',
    '--mute-audio',
    '--window-size=1280,900',
    HEADLESS ? '--headless=new' : '',
    'about:blank',
  ].filter(Boolean)

  const child = spawn(chromePath, args, { stdio: 'ignore' })
  await waitForDevTools(port)
  const page = await openPage(port, url)
  return { child, page, profile }
}

async function waitFor(page, description, predicate, timeoutMs = TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await page.evaluate(`return Boolean((${predicate})())`)) return
    await sleep(250)
  }

  const text = await page.evaluate('return document.body.innerText.slice(0, 1200)')
  throw new Error(`Timed out waiting for ${description}\n\nPage text:\n${text}`)
}

async function click(page, label) {
  await waitFor(page, `button "${label}"`, `() => Boolean(findControl(${JSON.stringify(label)}))`)
  const ok = await page.evaluate(`return clickControl(${JSON.stringify(label)})`)
  if (!ok) throw new Error(`Could not click ${label}`)
  await sleep(250)
}

async function drag(page, from, to, pointerType = 'mouse') {
  const ok = await page.evaluate(`return await dragSquare(${JSON.stringify(from)}, ${JSON.stringify(to)}, ${JSON.stringify(pointerType)})`)
  if (!ok) throw new Error(`Could not drag ${from} to ${to}`)
}

async function waitForPiece(page, square, classNamePart) {
  await waitFor(
    page,
    `${classNamePart} piece on ${square}`,
    `() => {
      const piece = squarePiece(${JSON.stringify(square)})
      return Boolean(piece && piece.className.includes(${JSON.stringify(classNamePart)}))
    }`,
  )
}

async function ensureAppReachable() {
  try {
    const response = await fetch(APP_URL)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    throw new Error(`APP_URL is not reachable (${APP_URL}). Start the backend or set APP_URL. ${error.message}`)
  }
}

async function main() {
  await ensureAppReachable()
  const chromePath = findChrome()
  if (!chromePath) {
    throw new Error('Chrome or Edge was not found. Set CHROME_PATH to run the multiplayer smoke test.')
  }

  const browsers = []
  try {
    const host = await launchBrowser('host', chromePath, APP_URL)
    browsers.push(host)

    await click(host.page, 'En l')
    await click(host.page, 'Multijugador')
    await click(host.page, 'Crear sala')
    await click(host.page, 'Crear sala')
    await waitFor(host.page, 'room code', '() => Boolean(roomCodeFromPage())')
    const code = await host.page.evaluate('return roomCodeFromPage()')

    const joinUrl = new URL(APP_URL)
    joinUrl.searchParams.set('room', code)
    const guest = await launchBrowser('guest', chromePath, joinUrl.toString())
    browsers.push(guest)

    await waitFor(guest.page, 'join screen', '() => Boolean(document.querySelector("#room-code"))')
    await guest.page.evaluate(`return setInputValue('#room-code', ${JSON.stringify(code)})`)
    await click(guest.page, 'Unirse a sala')

    await waitFor(host.page, 'host board', '() => Boolean(document.querySelector("[data-square=\\"e2\\"]"))')
    await waitFor(guest.page, 'guest board', '() => Boolean(document.querySelector("[data-square=\\"e7\\"]"))')

    await drag(host.page, 'e2', 'e4', 'mouse')
    await waitForPiece(host.page, 'e4', 'piece-white')
    await waitForPiece(guest.page, 'e4', 'piece-white')

    await drag(guest.page, 'e7', 'e5', 'mouse')
    await waitForPiece(host.page, 'e5', 'piece-black')
    await waitForPiece(guest.page, 'e5', 'piece-black')

    const summary = {
      ok: true,
      roomCode: code,
      host: await host.page.evaluate('return { e4: squarePiece("e4"), e5: squarePiece("e5") }'),
      guest: await guest.page.evaluate('return { e4: squarePiece("e4"), e5: squarePiece("e5") }'),
    }

    console.log(JSON.stringify(summary, null, 2))
  } finally {
    await Promise.allSettled(
      browsers.map(async ({ child, page, profile }) => {
        page.close()
        child.kill()
        await sleep(250)
        await rm(profile, { recursive: true, force: true })
      }),
    )
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
