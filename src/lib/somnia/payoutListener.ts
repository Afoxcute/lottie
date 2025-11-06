// Event listener service for automatic payout execution
import { SDK } from '@somnia-chain/streams'
import { getPublicClient, getPublicWebSocketClient, getPublisherAddress } from './clients'
import { watchBlocks } from 'viem/actions'
import { executePayout, getUnpaidGameEnds, isPayoutExecuted } from './payoutService'
import { GAME_ENDED_EVENT_ID } from './schemas'
import type { PayoutResult } from './payoutService'

// Track the last processed timestamp to avoid reprocessing
let lastProcessedTimestamp = 0 // Start from 0 to process all unpaid games on startup
let isListening = false
let listenerInterval: NodeJS.Timeout | null = null
let unwatchBlocks: (() => void) | null = null

// Process new game ends and execute payouts
async function processNewGameEnds(): Promise<PayoutResult[]> {
  try {
    const unpaidGames = await getUnpaidGameEnds()
    const results: PayoutResult[] = []

    // Filter to only process games that ended after the last processed timestamp
    // If lastProcessedTimestamp is 0, process all unpaid games (initial run)
    const newGames = unpaidGames.filter(game => {
      if (lastProcessedTimestamp === 0) {
        return true // Process all games on first run
      }
      const gameTimestamp = Number(game.timestamp)
      return gameTimestamp > lastProcessedTimestamp
    })

    if (newGames.length === 0) {
      return []
    }

    console.log(`[Payout Listener] Found ${newGames.length} new game end(s) to process`)

    for (const gameEnd of newGames) {
      try {
        // Double-check that payout hasn't been executed (race condition protection)
        const alreadyExecuted = await isPayoutExecuted(gameEnd.gameId)
        if (alreadyExecuted) {
          console.log(`[Payout Listener] Payout already executed for game ${gameEnd.gameId}`)
          continue
        }

        console.log(`[Payout Listener] Executing payout for game ${gameEnd.gameId}, winner: ${gameEnd.winner}, payout: ${gameEnd.payout}`)
        const result = await executePayout(gameEnd.gameId)
        results.push(result)

        if (result.success) {
          console.log(`[Payout Listener] ✅ Successfully executed payout for game ${result.gameId}, tx: ${result.txHash}`)
          // Update last processed timestamp
          const gameTimestamp = Number(gameEnd.timestamp)
          if (gameTimestamp > lastProcessedTimestamp) {
            lastProcessedTimestamp = gameTimestamp
          }
        } else {
          console.error(`[Payout Listener] ❌ Failed to execute payout for game ${result.gameId}: ${result.error}`)
        }

        // Small delay between payouts to avoid rate limiting
        if (results.length < newGames.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error: any) {
        console.error(`[Payout Listener] Error processing game ${gameEnd.gameId}:`, error)
        results.push({
          success: false,
          gameId: gameEnd.gameId,
          winner: gameEnd.winner,
          payout: gameEnd.payout,
          error: error?.message || String(error),
        })
      }
    }

    return results
  } catch (error) {
    console.error('[Payout Listener] Error fetching unpaid game ends:', error)
    return []
  }
}

// Start listening for GameEnded events using polling
export function startPayoutListener(intervalMs: number = 10000): void {
  if (isListening) {
    console.warn('[Payout Listener] Listener is already running')
    return
  }

  console.log(`[Payout Listener] Starting payout listener with ${intervalMs}ms interval`)
  isListening = true

  // Process immediately on start
  processNewGameEnds().catch(error => {
    console.error('[Payout Listener] Error in initial processing:', error)
  })

  // Set up interval polling
  listenerInterval = setInterval(async () => {
    if (!isListening) {
      return
    }

    try {
      const results = await processNewGameEnds()
      if (results.length > 0) {
        const successCount = results.filter(r => r.success).length
        const failCount = results.length - successCount
        console.log(`[Payout Listener] Processed ${results.length} payout(s): ${successCount} succeeded, ${failCount} failed`)
      }
    } catch (error) {
      console.error('[Payout Listener] Error in interval processing:', error)
    }
  }, intervalMs)
}

// Stop listening for events
export function stopPayoutListener(): void {
  if (!isListening) {
    console.warn('[Payout Listener] Listener is not running')
    return
  }

  console.log('[Payout Listener] Stopping payout listener')
  isListening = false

  if (listenerInterval) {
    clearInterval(listenerInterval)
    listenerInterval = null
  }

  if (unwatchBlocks) {
    unwatchBlocks()
    unwatchBlocks = null
  }
}

// Check if listener is running
export function isPayoutListenerRunning(): boolean {
  return isListening
}

// Start listening using WebSocket block watching (more efficient)
export async function startPayoutListenerWebSocket(intervalMs: number = 5000): Promise<void> {
  if (isListening) {
    console.warn('[Payout Listener] Listener is already running')
    return
  }

  console.log(`[Payout Listener] Starting WebSocket-based payout listener`)
  isListening = true

  // Process immediately on start
  processNewGameEnds().catch(error => {
    console.error('[Payout Listener] Error in initial processing:', error)
  })

  try {
    const publicClient = getPublicClient()
    
    // Watch for new blocks and process payouts when blocks are mined
    // Using HTTP client with watchBlocks - it will efficiently poll for new blocks
    unwatchBlocks = watchBlocks(publicClient, {
      onBlock: async () => {
        if (!isListening) {
          return
        }

        try {
          const results = await processNewGameEnds()
          if (results.length > 0) {
            const successCount = results.filter(r => r.success).length
            const failCount = results.length - successCount
            console.log(`[Payout Listener] Processed ${results.length} payout(s) on new block: ${successCount} succeeded, ${failCount} failed`)
          }
        } catch (error) {
          console.error('[Payout Listener] Error processing on new block:', error)
        }
      },
      onError: (error) => {
        console.error('[Payout Listener] Block watch error:', error)
        // Fallback to polling if watchBlocks fails
        console.log('[Payout Listener] Falling back to polling mode')
        if (unwatchBlocks) {
          unwatchBlocks()
          unwatchBlocks = null
        }
        stopPayoutListener()
        startPayoutListener(intervalMs)
      },
    })

    // Clear any existing interval since we're using watchBlocks now
    if (listenerInterval) {
      clearInterval(listenerInterval)
      listenerInterval = null
    }
  } catch (error) {
    console.error('[Payout Listener] Failed to start block watch listener, falling back to polling:', error)
    stopPayoutListener()
    startPayoutListener(intervalMs)
  }
}

// Get listener status
export function getPayoutListenerStatus() {
  return {
    isRunning: isListening,
    lastProcessedTimestamp,
    lastProcessedDate: new Date(lastProcessedTimestamp).toISOString(),
  }
}

// Reset last processed timestamp (useful for testing or manual reprocessing)
export function resetPayoutListenerTimestamp(): void {
  lastProcessedTimestamp = 0 // Reset to 0 to reprocess all unpaid games
  console.log('[Payout Listener] Reset last processed timestamp - will process all unpaid games on next run')
}

