// Lightweight API benchmark using autocannon
// Runs short bursts against hot endpoints and prints summary stats.

import autocannon from 'autocannon'

const BASE = process.env.API_URL || 'http://localhost:4000'

async function runOne(name, path, opts = {}) {
  const url = `${BASE}${path}`
  const instance = autocannon({
    url,
    connections: opts.connections ?? 20,
    pipelining: opts.pipelining ?? 1,
    duration: opts.duration ?? 5,
    method: opts.method ?? 'GET',
    headers: { 'Accept': 'application/json' }
  })
  return new Promise((resolve) => {
    autocannon.track(instance, { renderProgressBar: false })
    instance.on('done', (result) => {
      const { latency, throughput, requests } = result
      console.log(`\n[Bench] ${name} ${url}`)
      console.log(`  Latency (ms): p50=${latency.p50} p95=${latency.p95} p99=${latency.p99}`)
      console.log(`  Req/s: avg=${requests.average}`)
      console.log(`  Throughput (kb/s): avg=${throughput.average}`)
      resolve(result)
    })
  })
}

async function main() {
  try {
    await runOne('Sales list', '/sales?limit=100')
    await runOne('Products list', '/products?limit=100')
  } catch (e) {
    console.error('[Bench] Error:', e?.message || e)
    process.exitCode = 0 // non-blocking
  }
}

main()
