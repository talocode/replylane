function envFlag(name: string, defaultValue = true): boolean {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return value !== 'false'
}

export const config = {
  get port() {
    return parseInt(process.env.PORT || '3070', 10)
  },
  get talocodeBaseUrl() {
    return process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'
  },
  get talocodeApiKey() {
    return process.env.TALOCODE_API_KEY || ''
  },
  get allowLocalUnauth() {
    return envFlag('REPLYLANE_ALLOW_LOCAL_UNAUTH', true)
  },
  version: '0.1.0',
  service: 'replylane',
  maxBodyBytes: 2 * 1024 * 1024,
  requestTimeoutMs: 30000,
} as const