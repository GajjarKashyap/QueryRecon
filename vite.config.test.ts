import { describe, expect, it } from 'vitest'
import { isValidBedrockConfig, mergeLocalEnv } from './vite.config'

describe('local Bedrock configuration', () => {
  it('updates only the requested Hermes environment values', () => {
    expect(mergeLocalEnv('KEEP=yes\nAWS_REGION=old-region\n', {
      AWS_BEARER_TOKEN_BEDROCK: 'bedrock-secret',
      AWS_REGION: 'us-east-1',
    })).toBe('KEEP=yes\nAWS_REGION=us-east-1\nAWS_BEARER_TOKEN_BEDROCK=bedrock-secret\n')
  })

  it('rejects malformed regions and line-breaking secrets', () => {
    expect(isValidBedrockConfig('a'.repeat(24), 'us-east-1')).toBe(true)
    expect(isValidBedrockConfig('a'.repeat(24), 'not a region')).toBe(false)
    expect(isValidBedrockConfig(`${'a'.repeat(24)}\nINJECTED=yes`, 'us-east-1')).toBe(false)
  })
})
