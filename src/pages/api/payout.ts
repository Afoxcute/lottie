import type { NextApiRequest, NextApiResponse } from 'next'
import { executePayout, processAllUnpaidPayouts, getUnpaidGameEnds, getGameEndData } from '@/lib/somnia/payoutService'

export const config = {
  runtime: 'nodejs',
}

// Helper to serialize BigInt values in objects
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt)
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {}
    for (const key in obj) {
      serialized[key] = serializeBigInt(obj[key])
    }
    return serialized
  }
  
  return obj
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, ...params } = req.body

    switch (action) {
      case 'executePayout': {
        const { gameId } = params
        if (!gameId) {
          return res.status(400).json({ error: 'Missing gameId' })
        }
        const result = await executePayout(BigInt(gameId))
        return res.status(200).json(serializeBigInt(result))
      }

      case 'processAllPayouts': {
        const results = await processAllUnpaidPayouts()
        return res.status(200).json({ results: serializeBigInt(results) })
      }

      case 'getUnpaidPayouts': {
        const unpaidGames = await getUnpaidGameEnds()
        return res.status(200).json({ unpaidGames: serializeBigInt(unpaidGames) })
      }

      case 'getGameEndData': {
        const { gameId } = params
        if (!gameId) {
          return res.status(400).json({ error: 'Missing gameId' })
        }
        const gameEndData = await getGameEndData(BigInt(gameId))
        return res.status(200).json({ gameEndData: serializeBigInt(gameEndData) })
      }

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error: any) {
    console.error('Payout API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}


