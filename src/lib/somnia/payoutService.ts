// Payout service for executing token transfers to game winners
import { SDK, SchemaEncoder, zeroBytes32 } from '@somnia-chain/streams'
import { getPublicClient, getWalletClient, getPublisherAddress } from './clients'
import { waitForTransactionReceipt } from 'viem/actions'
import { toHex, type Hex } from 'viem'
import { gameEndSchema, payoutExecutedSchema } from './schemas'
import { somniaTestnet } from './chain'

// Helper to get SDK instance
function getSdk(write = false) {
  const publicClient = getPublicClient()
  const walletClient = write ? getWalletClient() : null
  
  if (!walletClient && write) {
    throw new Error('Wallet client not available. PRIVATE_KEY must be set for write operations.')
  }

  return new SDK({
    public: publicClient,
    wallet: walletClient || undefined,
  })
}

// Helper to extract value from decoded data
function getValue(field: any): any {
  if (field?.value?.value !== undefined) return field.value.value
  if (field?.value !== undefined) return field.value
  return field
}

// Interface for game end data
export interface GameEndData {
  gameId: bigint
  winner: `0x${string}`
  payout: bigint
  finalScores: [number, number]
  timestamp: bigint
}

// Interface for payout execution result
export interface PayoutResult {
  success: boolean
  gameId: bigint
  winner: `0x${string}`
  payout: bigint
  txHash?: `0x${string}`
  error?: string
}

// Get game end data for a specific game
export async function getGameEndData(gameId: bigint): Promise<GameEndData | null> {
  const sdk = getSdk(false)
  let publisher = getPublisherAddress()
  
  if (!publisher) {
    publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | null
  }
  
  if (!publisher) {
    throw new Error('Publisher address not configured. Set NEXT_PUBLIC_PUBLISHER_ADDRESS in environment variables.')
  }

  const gameEndSchemaId = await sdk.streams.computeSchemaId(gameEndSchema)
  if (!gameEndSchemaId) return null

  const gameEndKey = toHex(`end-${gameId}`, { size: 32 })
  const data = await sdk.streams.getByKey(gameEndSchemaId, publisher, gameEndKey)

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null
  }

  const decoded = data[0] as any[]
  if (!Array.isArray(decoded) || decoded.length < 5) return null

  const scoresValue = getValue(decoded[4])
  const scores = Array.isArray(scoresValue) 
    ? [Number(scoresValue[0] ?? 0), Number(scoresValue[1] ?? 0)] as [number, number]
    : [0, 0] as [number, number]

  return {
    gameId: BigInt(String(getValue(decoded[1]))),
    winner: String(getValue(decoded[2])) as `0x${string}`,
    payout: BigInt(String(getValue(decoded[3]))),
    finalScores: scores,
    timestamp: BigInt(String(getValue(decoded[0]))),
  }
}

// Check if payout has already been executed
export async function isPayoutExecuted(gameId: bigint): Promise<boolean> {
  const sdk = getSdk(false)
  let publisher = getPublisherAddress()
  
  if (!publisher) {
    publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | null
  }
  
  if (!publisher) return false

  const payoutExecutedSchemaId = await sdk.streams.computeSchemaId(payoutExecutedSchema)
  if (!payoutExecutedSchemaId) return false

  const payoutKey = toHex(`payout-${gameId}`, { size: 32 })
  const data = await sdk.streams.getByKey(payoutExecutedSchemaId, publisher, payoutKey)

  return !!(data && Array.isArray(data) && data.length > 0)
}

// Get all game end events that haven't been paid out
export async function getUnpaidGameEnds(): Promise<GameEndData[]> {
  const sdk = getSdk(false)
  let publisher = getPublisherAddress()
  
  if (!publisher) {
    publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | null
  }
  
  if (!publisher) {
    throw new Error('Publisher address not configured. Set NEXT_PUBLIC_PUBLISHER_ADDRESS in environment variables.')
  }

  const gameEndSchemaId = await sdk.streams.computeSchemaId(gameEndSchema)
  if (!gameEndSchemaId) return []

  try {
    const allGameEnds = await sdk.streams.getAllPublisherDataForSchema(gameEndSchemaId, publisher)
    if (!allGameEnds || !Array.isArray(allGameEnds)) return []

    const unpaidGames: GameEndData[] = []
    
    for (const row of allGameEnds) {
      if (Array.isArray(row) && row.length >= 5) {
        const gameId = BigInt(String(getValue(row[1])))
        const winner = String(getValue(row[2])) as `0x${string}`
        const payout = BigInt(String(getValue(row[3])))
        
        // Skip if no winner or zero payout
        if (winner === '0x0000000000000000000000000000000000000000' || payout === BigInt(0)) {
          continue
        }

        // Check if payout already executed
        const isExecuted = await isPayoutExecuted(gameId)
        if (isExecuted) continue

        const scoresValue = getValue(row[4])
        const scores = Array.isArray(scoresValue) 
          ? [Number(scoresValue[0] ?? 0), Number(scoresValue[1] ?? 0)] as [number, number]
          : [0, 0] as [number, number]

        unpaidGames.push({
          gameId,
          winner,
          payout,
          finalScores: scores,
          timestamp: BigInt(String(getValue(row[0]))),
        })
      }
    }

    return unpaidGames
  } catch (error) {
    console.error('Error fetching unpaid game ends:', error)
    return []
  }
}

// Execute payout for a specific game
export async function executePayout(gameId: bigint): Promise<PayoutResult> {
  const walletClient = getWalletClient()
  if (!walletClient || !walletClient.account) {
    return {
      success: false,
      gameId,
      winner: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      payout: BigInt(0),
      error: 'Wallet client not available. PRIVATE_KEY must be set.',
    }
  }

  try {
    // Check if payout already executed
    const isExecuted = await isPayoutExecuted(gameId)
    if (isExecuted) {
      return {
        success: false,
        gameId,
        winner: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        payout: BigInt(0),
        error: 'Payout already executed for this game',
      }
    }

    // Get game end data
    const gameEndData = await getGameEndData(gameId)
    if (!gameEndData) {
      return {
        success: false,
        gameId,
        winner: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        payout: BigInt(0),
        error: 'Game end data not found',
      }
    }

    // Skip if no winner or zero payout
    if (gameEndData.winner === '0x0000000000000000000000000000000000000000' || gameEndData.payout === BigInt(0)) {
      return {
        success: false,
        gameId,
        winner: gameEndData.winner,
        payout: gameEndData.payout,
        error: 'No winner or zero payout',
      }
    }

    const publicClient = getPublicClient()
    
    // Check wallet balance
    const balance = await publicClient.getBalance({ address: walletClient.account.address })
    if (balance < gameEndData.payout) {
      return {
        success: false,
        gameId,
        winner: gameEndData.winner,
        payout: gameEndData.payout,
        error: `Insufficient balance. Required: ${gameEndData.payout.toString()}, Available: ${balance.toString()}`,
      }
    }

    // Execute native token transfer
    if (!walletClient.account) {
      return {
        success: false,
        gameId,
        winner: gameEndData.winner,
        payout: gameEndData.payout,
        error: 'Wallet account not available',
      }
    }

    const txHash = await walletClient.sendTransaction({
      account: walletClient.account,
      chain: somniaTestnet,
      to: gameEndData.winner,
      value: gameEndData.payout,
    })

    // Wait for transaction receipt
    await waitForTransactionReceipt(publicClient, { hash: txHash })

    // Record payout execution in Data Streams
    const sdk = getSdk(true)
    
    // Ensure payout executed schema is registered
    const payoutExecutedSchemaId = await sdk.streams.computeSchemaId(payoutExecutedSchema)
    if (payoutExecutedSchemaId) {
      const isRegistered = await sdk.streams.isDataSchemaRegistered(payoutExecutedSchemaId)
      if (!isRegistered) {
        try {
          const registerTx = await sdk.streams.registerDataSchemas([
            { id: 'payoutExecuted', schema: payoutExecutedSchema, parentSchemaId: zeroBytes32 as `0x${string}` }
          ], true)
          if (registerTx) {
            await waitForTransactionReceipt(publicClient, { hash: registerTx as Hex })
          }
        } catch (error) {
          console.warn('Failed to register payout executed schema:', error)
        }
      }

      // Record payout execution
      const payoutEncoder = new SchemaEncoder(payoutExecutedSchema)
      const payoutData = payoutEncoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'gameId', value: gameId.toString(), type: 'uint256' },
        { name: 'winner', value: gameEndData.winner, type: 'address' },
        { name: 'payout', value: gameEndData.payout.toString(), type: 'uint256' },
        { name: 'txHash', value: txHash, type: 'bytes32' }, // Stored as hex string
      ])

      const payoutKey = toHex(`payout-${gameId}`, { size: 32 })
      const recordTx = await sdk.streams.set([{
        id: payoutKey,
        schemaId: payoutExecutedSchemaId,
        data: payoutData,
      }])
      
      // Wait for the record transaction if it exists
      if (recordTx) {
        await waitForTransactionReceipt(publicClient, { hash: recordTx as Hex })
      }
    }

    return {
      success: true,
      gameId,
      winner: gameEndData.winner,
      payout: gameEndData.payout,
      txHash,
    }
  } catch (error: any) {
    console.error('Error executing payout:', error)
    return {
      success: false,
      gameId,
      winner: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      payout: BigInt(0),
      error: error?.message || String(error),
    }
  }
}

// Process all unpaid payouts
export async function processAllUnpaidPayouts(): Promise<PayoutResult[]> {
  const unpaidGames = await getUnpaidGameEnds()
  const results: PayoutResult[] = []

  for (const gameEnd of unpaidGames) {
    const result = await executePayout(gameEnd.gameId)
    results.push(result)
    
    // Small delay between payouts to avoid rate limiting
    if (results.length < unpaidGames.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

