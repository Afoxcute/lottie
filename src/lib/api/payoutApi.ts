// Client API for payout operations
import type { PayoutResult, GameEndData } from '@/lib/somnia/payoutService'

const API_BASE = '/api/payout'

export async function executePayoutAPI(gameId: string): Promise<PayoutResult> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'executePayout',
      gameId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to execute payout')
  }

  return response.json()
}

export async function processAllPayoutsAPI(): Promise<{ results: PayoutResult[] }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'processAllPayouts',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to process payouts')
  }

  return response.json()
}

export async function getUnpaidPayoutsAPI(): Promise<{ unpaidGames: GameEndData[] }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getUnpaidPayouts',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch unpaid payouts')
  }

  return response.json()
}

export async function getGameEndDataAPI(gameId: string): Promise<{ gameEndData: GameEndData | null }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getGameEndData',
      gameId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch game end data')
  }

  return response.json()
}


