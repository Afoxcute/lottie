import type { NextApiRequest, NextApiResponse } from 'next'
import { createGame, getGameById, getUserGames, joinGame, makeMove } from '@/lib/somnia/gameService'
import { parseEther } from 'viem'
import type { Game } from '@/types'

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
      case 'createGame': {
        const { gameType, stake, playerAddress } = params
        if (gameType === undefined || gameType === null || !stake || !playerAddress) {
          return res.status(400).json({ error: 'Missing required parameters' })
        }
        const result = await createGame(
          Number(gameType),
          parseEther(stake),
          playerAddress as `0x${string}`
        )
        return res.status(200).json(serializeBigInt(result))
      }

      case 'joinGame': {
        const { gameId, player2Address, stake } = params
        if (!gameId || !player2Address || !stake) {
          return res.status(400).json({ error: 'Missing required parameters' })
        }
        const result = await joinGame(
          BigInt(gameId),
          player2Address as `0x${string}`,
          parseEther(stake)
        )
        return res.status(200).json(serializeBigInt(result))
      }

      case 'makeMove': {
        const { gameId, playerAddress, choice } = params
        if (!gameId || !playerAddress || choice === undefined || choice === null) {
          return res.status(400).json({ error: 'Missing required parameters' })
        }
        const result = await makeMove(
          BigInt(gameId),
          playerAddress as `0x${string}`,
          Number(choice)
        )
        return res.status(200).json(serializeBigInt(result))
      }

      case 'getGame': {
        const { gameId } = params
        if (!gameId) {
          return res.status(400).json({ error: 'Missing gameId' })
        }
        const game = await getGameById(BigInt(gameId))
        return res.status(200).json({ game: serializeBigInt(game) })
      }

      case 'getUserGames': {
        const { userAddress } = params
        if (!userAddress) {
          return res.status(400).json({ error: 'Missing userAddress' })
        }
        const gameIds = await getUserGames(userAddress as `0x${string}`)
        return res.status(200).json({ gameIds: gameIds.map(id => id.toString()) })
      }

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error: any) {
    console.error('API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}

