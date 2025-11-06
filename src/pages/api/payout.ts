import type { NextApiRequest, NextApiResponse } from 'next'
import { executePayout, processAllUnpaidPayouts, getUnpaidGameEnds, getGameEndData } from '@/lib/somnia/payoutService'
import { 
  startPayoutListener, 
  stopPayoutListener, 
  isPayoutListenerRunning, 
  getPayoutListenerStatus,
  resetPayoutListenerTimestamp,
  startPayoutListenerWebSocket
} from '@/lib/somnia/payoutListener'

// Auto-start listener on server startup (only runs once when module is loaded)
if (process.env.AUTO_START_PAYOUT_LISTENER !== 'false') {
  const LISTENER_INTERVAL_MS = Number(process.env.PAYOUT_LISTENER_INTERVAL_MS) || 10000
  console.log('[Payout API] Auto-starting payout listener on server startup...')
  
  // Use WebSocket if available, fallback to polling
  startPayoutListenerWebSocket(LISTENER_INTERVAL_MS).catch((error) => {
    console.error('[Payout API] Failed to start WebSocket listener, using polling:', error)
  })
}

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

      case 'startListener': {
        const { intervalMs, useWebSocket } = params
        const interval = intervalMs ? Number(intervalMs) : 10000
        
        if (useWebSocket) {
          await startPayoutListenerWebSocket(interval)
        } else {
          startPayoutListener(interval)
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Payout listener started',
          status: getPayoutListenerStatus()
        })
      }

      case 'stopListener': {
        stopPayoutListener()
        return res.status(200).json({ 
          success: true, 
          message: 'Payout listener stopped',
          status: getPayoutListenerStatus()
        })
      }

      case 'getListenerStatus': {
        return res.status(200).json({ status: getPayoutListenerStatus() })
      }

      case 'resetListenerTimestamp': {
        resetPayoutListenerTimestamp()
        return res.status(200).json({ 
          success: true, 
          message: 'Listener timestamp reset',
          status: getPayoutListenerStatus()
        })
      }

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error: any) {
    console.error('Payout API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}


