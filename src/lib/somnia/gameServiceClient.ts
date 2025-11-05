// Client-side service for reading game data from Somnia Data Streams
import { SDK } from '@somnia-chain/streams'
import { getPublicClient } from './clients'
import { gameSchema, gameCreatedSchema, gameJoinedSchema, moveSchema } from './schemas'
import { toHex } from 'viem'
import type { Game } from '@/types'

function getClientSdk() {
  return new SDK({
    public: getPublicClient(),
  })
}

// Helper to extract value from decoded data
function getValue(field: any): any {
  if (field?.value?.value !== undefined) return field.value.value
  if (field?.value !== undefined) return field.value
  return field
}

// Get game by ID (client-side)
export async function getGameByIdClient(gameId: bigint): Promise<Game | null> {
  const sdk = getClientSdk()
  const publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | undefined
  
  if (!publisher) {
    console.warn('Publisher address not configured')
    return null
  }

  const gameSchemaId = await sdk.streams.computeSchemaId(gameSchema)
  if (!gameSchemaId) return null

  const gameStateKey = toHex(`game-${gameId}`, { size: 32 })
  const data = await sdk.streams.getByKey(gameSchemaId, publisher, gameStateKey)

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null
  }

  const decoded = data[0] as any[]
  if (!Array.isArray(decoded) || decoded.length < 11) return null

  // Fetch player moves
  const player1Moves = await getPlayerMovesClient(gameId, getValue(decoded[2]) as string)
  const player2Moves = await getPlayerMovesClient(gameId, getValue(decoded[3]) as string)

  const scoresValue = getValue(decoded[7])
  const choicesValue = getValue(decoded[8])
  
  const scores = Array.isArray(scoresValue) 
    ? [Number(scoresValue[0] ?? 0), Number(scoresValue[1] ?? 0)]
    : [0, 0]
    
  const choices = Array.isArray(choicesValue)
    ? [Number(choicesValue[0] ?? 0), Number(choicesValue[1] ?? 0)]
    : [0, 0]

  return {
    gameId: BigInt(String(getValue(decoded[1]))),
    players: [String(getValue(decoded[2])), String(getValue(decoded[3]))],
    stake: BigInt(String(getValue(decoded[4]))),
    gameType: Number(getValue(decoded[5])),
    roundsPlayed: Number(getValue(decoded[6])),
    scores,
    choices,
    isActive: Boolean(getValue(decoded[9])),
    lastPlayerMove: String(getValue(decoded[10])),
    player1Moves,
    player2Moves,
  }
}

// Get player moves for a game
async function getPlayerMovesClient(gameId: bigint, playerAddress: string): Promise<number[]> {
  const sdk = getClientSdk()
  const publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | undefined
  
  if (!publisher) return []

  const moveSchemaId = await sdk.streams.computeSchemaId(moveSchema)
  if (!moveSchemaId) return []

  try {
    const allMoves = await sdk.streams.getAllPublisherDataForSchema(moveSchemaId, publisher)
    if (!allMoves || !Array.isArray(allMoves)) return []

    const moves: number[] = []
    for (const row of allMoves) {
      if (Array.isArray(row) && row.length >= 4) {
        const moveGameId = BigInt(getValue(row[1]))
        const movePlayer = String(getValue(row[2])).toLowerCase()
        
        if (moveGameId === gameId && movePlayer === playerAddress.toLowerCase()) {
          moves.push(Number(getValue(row[3])))
        }
      }
    }
    
    return moves.sort((a, b) => a - b) // Sort by round number if needed
  } catch (error) {
    console.error('Error fetching player moves:', error)
    return []
  }
}

// Get all games for a user (client-side)
export async function getUserGamesClient(userAddress: `0x${string}`): Promise<bigint[]> {
  const sdk = getClientSdk()
  const publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | undefined
  
  if (!publisher) return []

  const gameIdsSet = new Set<string>()

  // Check created games
  const gameCreatedSchemaId = await sdk.streams.computeSchemaId(gameCreatedSchema)
  if (gameCreatedSchemaId) {
    try {
      const createdData = await sdk.streams.getAllPublisherDataForSchema(gameCreatedSchemaId, publisher)
      if (Array.isArray(createdData)) {
        for (const row of createdData) {
          if (Array.isArray(row) && row.length > 0) {
            const player1 = String(getValue(row[2])).toLowerCase()
            const gameId = BigInt(String(getValue(row[1])))
            
            if (player1 === userAddress.toLowerCase()) {
              gameIdsSet.add(gameId.toString())
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching created games:', error)
    }
  }

  // Check joined games
  const gameJoinedSchemaId = await sdk.streams.computeSchemaId(gameJoinedSchema)
  if (gameJoinedSchemaId) {
    try {
      const joinedData = await sdk.streams.getAllPublisherDataForSchema(gameJoinedSchemaId, publisher)
      if (Array.isArray(joinedData)) {
        for (const row of joinedData) {
          if (Array.isArray(row) && row.length > 0) {
            const player2 = String(getValue(row[2])).toLowerCase()
            const gameId = BigInt(String(getValue(row[1])))
            
            if (player2 === userAddress.toLowerCase()) {
              gameIdsSet.add(gameId.toString())
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching joined games:', error)
    }
  }

  return Array.from(gameIdsSet).map(id => BigInt(id))
}

