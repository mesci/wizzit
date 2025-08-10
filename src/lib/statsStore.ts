import { logger } from './logger'

interface StatsStore {
  incrementIfFirst(transferId: string): Promise<boolean>
  getTotal(): Promise<number>
  backend(): 'kv' | 'memory'
}

class InMemoryStatsStore implements StatsStore {
  private total = 0
  backend() { return 'memory' as const }
  async incrementIfFirst(transferId: string): Promise<boolean> {
    // Single counter mode: always increment
    this.total += 1
    return true
  }
  async getTotal(): Promise<number> {
    return this.total
  }
}

class UpstashStatsStore implements StatsStore {
  private url: string
  private token: string
  private counterKey = 'wizzit:stats:total_completed'
  backend() { return 'kv' as const }
  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '')
    this.token = token
  }
  private async redis(cmd: string, ...args: (string|number)[]): Promise<any> {
    const endpoint = `${this.url}/${cmd}/${args.map(encodeURIComponent).join('/')}`
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${this.token}` } })
    if (!res.ok) throw new Error(`Upstash error: ${res.status}`)
    return res.json()
  }
  async incrementIfFirst(transferId: string): Promise<boolean> {
    try {
      await this.redis('INCR', this.counterKey)
      return true
    } catch (e) {
      logger.warn('KV incrementIfFirst failed, falling back to memory:', e as any)
      return memoryStore.incrementIfFirst(transferId)
    }
  }
  async getTotal(): Promise<number> {
    try {
      const resp = await this.redis('GET', this.counterKey)
      const val = resp?.result
      const num = typeof val === 'string' ? parseInt(val, 10) : (typeof val === 'number' ? val : 0)
      return Number.isFinite(num) ? num : 0
    } catch (e) {
      logger.warn('KV getTotal failed, falling back to memory:', e as any)
      return memoryStore.getTotal()
    }
  }
}

const memoryStore = new InMemoryStatsStore()

let store: StatsStore = memoryStore
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  store = new UpstashStatsStore(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN)
}

export const statsStore: StatsStore = store

