export class UpstashKV {
  private url: string
  private token: string
  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '')
    this.token = token
  }
  private async call(cmd: string, ...args: (string | number)[]) {
    const endpoint = `${this.url}/${cmd}/${args.map(encodeURIComponent).join('/')}`
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${this.token}` } })
    if (!res.ok) throw new Error(`Upstash KV error: ${res.status}`)
    return res.json()
  }
  async setWithTTL(key: string, value: string, ttlSeconds: number) {
    // SET key value EX ttl
    return this.call('SET', key, value, 'EX', ttlSeconds)
  }
  async get(key: string): Promise<string | null> {
    const out = await this.call('GET', key)
    return typeof out?.result === 'string' ? out.result : null
  }
}

