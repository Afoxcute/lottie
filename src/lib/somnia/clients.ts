import { createPublicClient, createWalletClient, http, webSocket } from 'viem'
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { somniaTestnet } from './chain'

function need(key: 'RPC_URL' | 'PRIVATE_KEY'): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing ${key} in environment variables`)
  return v
}

const rpcUrl = process.env.RPC_URL || 'https://dream-rpc.somnia.network'
const wsUrl = process.env.WS_RPC_URL || rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://')

// Public client for reading data
export function getPublicClient() {
  return createPublicClient({
    chain: somniaTestnet,
    transport: http(rpcUrl),
  })
}

// Public client with WebSocket for subscriptions
export function getPublicWebSocketClient() {
  try {
    return createPublicClient({
      chain: somniaTestnet,
      transport: webSocket(wsUrl),
    })
  } catch {
    // Fallback to HTTP if WebSocket fails
    return getPublicClient()
  }
}

// Wallet client for writing data (server-side only)
export function getWalletClient(): ReturnType<typeof createWalletClient> | null {
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    console.warn('PRIVATE_KEY not set - wallet client unavailable')
    return null
  }

  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    return createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(rpcUrl),
    })
  } catch (error) {
    console.error('Failed to create wallet client:', error)
    return null
  }
}

// Get publisher address
export function getPublisherAddress(): `0x${string}` | null {
  const walletClient = getWalletClient()
  if (!walletClient || !walletClient.account) {
    // Fallback to environment variable if wallet client unavailable
    const pubAddress = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS
    if (pubAddress) return pubAddress as `0x${string}`
    return null
  }
  return walletClient.account.address
}

// Get publisher address for client-side (from env)
export function getPublisherAddressClient(): `0x${string}` | null {
  if (typeof window === 'undefined') return null
  const pubAddress = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS
  return pubAddress ? (pubAddress as `0x${string}`) : null
}

// Get platform wallet address for receiving stakes and sending payouts (configurable)
export function getPlatformWalletAddress(): `0x${string}` | null {
  // First check for dedicated platform wallet address
  const platformAddress = process.env.PLATFORM_WALLET_ADDRESS || process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS
  if (platformAddress) {
    return platformAddress as `0x${string}`
  }
  
  // Fallback to publisher address if platform wallet not configured
  const pubAddress = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS
  if (pubAddress) {
    return pubAddress as `0x${string}`
  }
  
  // Last resort: use wallet client address
  const walletClient = getWalletClient()
  if (walletClient?.account) {
    return walletClient.account.address
  }
  
  return null
}

// Get platform wallet address for client-side (from env)
export function getPlatformWalletAddressClient(): `0x${string}` | null {
  if (typeof window === 'undefined') return null
  // Check for dedicated platform wallet address
  const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS
  if (platformAddress) {
    return platformAddress as `0x${string}`
  }
  
  // Fallback to publisher address
  const pubAddress = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS
  return pubAddress ? (pubAddress as `0x${string}`) : null
}

