#!/usr/bin/env node
/**
 * Functional smoke test for MediTrack SafetyNet.
 *
 * Opens the app in headless Chrome via the DevTools protocol and checks the
 * end-to-end story: page loads, engine preview renders, findings are present,
 * dose statuses are computed, and nothing is blocked (console errors, bad
 * network responses, horizontal overflow).
 *
 * Usage:
 *   node scripts/smoke.js [URL]
 *
 * Default URL: the deployed GitHub Pages site.
 */

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const URL_TO_TEST = process.argv[2] || 'https://risim-hanse.github.io/hackathon/'

const CHROME_PATHS = [
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

async function main() {
  const chromePath = CHROME_PATHS.find((candidate) => {
    try {
      fs.accessSync(candidate)
      return true
    } catch {
      return false
    }
  })
  if (!chromePath) throw new Error('Chrome not found. Set CHROME_BIN or install Google Chrome.')

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'meditrack-smoke-'))
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      URL_TO_TEST,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )

  const devtoolsUrl = await new Promise((resolve, reject) => {
    let data = ''
    chrome.stderr.on('data', (chunk) => {
      data += chunk
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(data)
      if (match) resolve(match[1])
    })
    chrome.on('exit', () => reject(new Error(`Chrome exited early: ${data}`)))
    setTimeout(() => reject(new Error('Timed out waiting for DevTools')), 15000)
  })
  // The DevTools endpoint is ws://, but /json/list is served over http://
  // on the same host and port.
  const devtools = new URL(devtoolsUrl)
  const devtoolsBase = `${devtools.protocol.replace('ws:', 'http:')}//${devtools.host}`

  let targets = []
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${devtoolsBase}/json/list`)
      if (response.ok) {
        targets = await response.json()
        if (targets.some((target) => target.type === 'page')) break
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  const page = targets.find((target) => target.type === 'page')
  if (!page) throw new Error('No page target in Chrome')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  let nextId = 0
  const pending = new Map()
  const consoleErrors = []
  const badResponses = []
  const pageErrors = []
  let loadResolve = null
  const load = new Promise((resolve) => {
    loadResolve = resolve
  })

  ws.onmessage = (message) => {
    const payload = JSON.parse(message.data)
    if (payload.id && pending.has(payload.id)) {
      pending.get(payload.id)(payload)
      pending.delete(payload.id)
      return
    }
    if (payload.method === 'Page.loadEventFired') loadResolve()
    if (payload.method === 'Runtime.exceptionThrown') {
      const details = payload.params.exceptionDetails
      pageErrors.push(details.text || details.exception?.description || 'exception')
    }
    if (payload.method === 'Runtime.consoleAPICalled' && payload.params.type === 'error') {
      consoleErrors.push(
        payload.params.args
          .map((arg) => arg.value ?? arg.description ?? arg.type)
          .join(' '),
      )
    }
    if (payload.method === 'Log.entryAdded' && payload.params.entry.level === 'error') {
      consoleErrors.push(payload.params.entry.text)
    }
    if (payload.method === 'Network.responseReceived' && payload.params.response.status >= 400) {
      badResponses.push(`HTTP ${payload.params.response.status} ${payload.params.response.url}`)
    }
    if (payload.method === 'Network.loadingFailed') {
      badResponses.push(`Network error: ${payload.params.errorText}`)
    }
  }

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = ++nextId
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await Promise.race([load, new Promise((resolve) => setTimeout(resolve, 8000))])
  await new Promise((resolve) => setTimeout(resolve, 1200))

  // First run shows onboarding; enter the sample plan for the smoke checks.
  await send('Runtime.evaluate', {
    expression: `document.querySelector('[data-testid="onboarding-demo"]')?.click()`,
  })
  await new Promise((resolve) => setTimeout(resolve, 900))

  const getState = async (expression) =>
    JSON.parse((await send('Runtime.evaluate', { expression, returnByValue: true })).result.result.value)

  const todayState = await getState(`JSON.stringify({
    title: document.title,
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    headings: [...document.querySelectorAll('main h1, main h2')].map((h) => h.textContent.trim()),
    doseRows: document.querySelectorAll('[data-testid="dose-row"]').length,
    modeButtons: [...document.querySelectorAll('button')].filter((b) => ['Elderly', 'Caregiver'].includes(b.textContent.trim())).length,
    heroText: document.querySelector('.hero')?.textContent || '',
  })`)

  await send('Runtime.evaluate', {
    expression: `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Safety')?.click()`,
  })
  await new Promise((resolve) => setTimeout(resolve, 600))

  const safetyState = await getState(`JSON.stringify({
    score: (document.querySelector('[data-testid="safety-score"]')?.textContent || '').trim(),
    findings: document.querySelectorAll('[data-testid="finding-card"]').length,
    headings: [...document.querySelectorAll('main h1')].map((h) => h.textContent.trim()),
  })`)

  ws.close()
  await new Promise((resolve) => {
    if (chrome.exitCode !== null) resolve()
    else chrome.once('exit', () => resolve())
    setTimeout(() => chrome.kill('SIGKILL'), 5000).unref()
  })
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(profile, { recursive: true, force: true })
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const parsed = {
    ...todayState,
    heroScore: safetyState.score,
    findings: safetyState.findings,
    safetyHeading: safetyState.headings,
  }
  const checks = [
    ['Page loads with a title', Boolean(parsed.title)],
    ['Title mentions MediTrack SafetyNet', parsed.title.includes('MediTrack SafetyNet')],
    ['No horizontal overflow (scrollWidth <= innerWidth)', parsed.scrollWidth <= parsed.innerWidth + 1],
    ['Today schedule renders', parsed.headings.some((h) => /today/i.test(h))],
    ['Safety view opens', parsed.safetyHeading.some((h) => /regimen at a glance/i.test(h))],
    ['Safety score parsed as 0-100', /^\d{1,3}$/.test(parsed.heroScore) && Number(parsed.heroScore) <= 100],
    ['At least one safety finding renders', parsed.findings > 0],
    ['Dose rows are computed', parsed.doseRows > 0],
    ['Two modes are available', parsed.modeButtons >= 2],
    ['No console errors', consoleErrors.length === 0],
    ['No bad network responses', badResponses.length === 0],
    ['No JS exceptions', pageErrors.length === 0],
  ]

  let failed = 0
  console.log(`\nSmoke test: ${URL_TO_TEST}`)
  console.log('  Title:', JSON.stringify(parsed.title))
  console.log('  Viewport:', `${parsed.innerWidth}px, scroll ${parsed.scrollWidth}px`)
  console.log('  Safety score:', parsed.heroScore)
  console.log('  Findings:', parsed.findings)
  console.log('  Dose rows:', parsed.doseRows)
  console.log('  Mode buttons:', parsed.modeButtons)
  console.log('')
  for (const [name, ok] of checks) {
    if (!ok) failed += 1
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`)
  }
  if (consoleErrors.length) console.log('  consoleErrors:', consoleErrors)
  if (badResponses.length) console.log('  badResponses:', badResponses)
  if (pageErrors.length) console.log('  pageErrors:', pageErrors)

  console.log(`\nResult: ${checks.filter(([, ok]) => ok).length}/${checks.length} checks passed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('smoke failed:', error)
  process.exit(1)
})
