// Test setup for browser APIs
import { vi } from 'vitest'

// Mock crypto.subtle for testing
const mockCryptoKey = {
  type: 'private',
  extractable: true,
  algorithm: { name: 'RSASSA-PKCS1-v1_5' },
  usages: ['sign']
}

const mockCrypto = {
  subtle: {
    importKey: vi.fn().mockResolvedValue(mockCryptoKey),
    generateKey: vi.fn().mockResolvedValue({
      privateKey: mockCryptoKey,
      publicKey: { ...mockCryptoKey, type: 'public', usages: ['verify'] }
    }),
    exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(100))
  }
}

// Mock global crypto
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
})

// Mock DOMParser
const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.DOMParser = dom.window.DOMParser

// Mock atob and btoa
global.atob = vi.fn((str: string) => {
  return Buffer.from(str, 'base64').toString('binary')
})

global.btoa = vi.fn((str: string) => {
  return Buffer.from(str, 'binary').toString('base64')
}) 