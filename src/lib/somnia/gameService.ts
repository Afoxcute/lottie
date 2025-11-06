import { SDK, SchemaEncoder, zeroBytes32 } from '@somnia-chain/streams'
import { getPublicClient, getWalletClient, getPublisherAddress } from './clients'
import { waitForTransactionReceipt } from 'viem/actions'
import { toHex, keccak256, stringToHex, type Hex } from 'viem'
import {
  gameSchema,
  gameCreatedSchema,
  gameJoinedSchema,
  moveSchema,
  roundResultSchema,
  gameEndSchema,
  GAME_CREATED_EVENT_ID,
  GAME_JOINED_EVENT_ID,
  PLAYER_MOVED_EVENT_ID,
  ROUND_PLAYED_EVENT_ID,
  GAME_ENDED_EVENT_ID,
} from './schemas'
import type { Game } from '@/types'

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

// Ensure schemas are registered
async function ensureSchemasRegistered() {
  const walletClient = getWalletClient()
  if (!walletClient) {
    throw new Error('Wallet client not available. Please set PRIVATE_KEY in environment variables.')
  }

  const sdk = getSdk(true)
  const schemas = [
    { id: 'game', schema: gameSchema },
    { id: 'gameCreated', schema: gameCreatedSchema },
    { id: 'gameJoined', schema: gameJoinedSchema },
    { id: 'move', schema: moveSchema },
    { id: 'roundResult', schema: roundResultSchema },
    { id: 'gameEnd', schema: gameEndSchema },
  ]

  for (const { id, schema } of schemas) {
    const schemaId = await sdk.streams.computeSchemaId(schema)
    if (!schemaId) continue

    const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId)
    if (!isRegistered) {
      try {
        const tx = await sdk.streams.registerDataSchemas([
          { id, schema, parentSchemaId: zeroBytes32 as `0x${string}` }
        ], true)
        if (tx) {
          await waitForTransactionReceipt(getPublicClient(), { hash: tx as Hex })
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error)
        if (errorMessage.includes('account does not exist') || errorMessage.includes('insufficient funds')) {
          const walletAddress = walletClient.account?.address || 'unknown'
          throw new Error(
            `Account not funded or does not exist on Somnia Testnet. ` +
            `Please fund your wallet (address: ${walletAddress}) with STT tokens from the Somnia faucet. ` +
            `Original error: ${errorMessage}`
          )
        }
        // If schema registration fails but it's not a critical error, continue
        console.warn(`Failed to register schema ${id}:`, errorMessage)
      }
    }
  }
}

// Register event schemas
async function ensureEventSchemasRegistered() {
  const walletClient = getWalletClient()
  if (!walletClient) {
    throw new Error('Wallet client not available. Please set PRIVATE_KEY in environment variables.')
  }

  const sdk = getSdk(true)

  try {
    await sdk.streams.registerEventSchemas(
      [GAME_CREATED_EVENT_ID, GAME_JOINED_EVENT_ID, PLAYER_MOVED_EVENT_ID, ROUND_PLAYED_EVENT_ID, GAME_ENDED_EVENT_ID],
      [
        {
          params: [{ name: 'gameId', paramType: 'uint256', isIndexed: true }],
          eventTopic: 'GameCreated(uint256 indexed gameId)',
        },
        {
          params: [{ name: 'gameId', paramType: 'uint256', isIndexed: true }],
          eventTopic: 'GameJoined(uint256 indexed gameId)',
        },
        {
          params: [{ name: 'gameId', paramType: 'uint256', isIndexed: true }],
          eventTopic: 'PlayerMoved(uint256 indexed gameId)',
        },
        {
          params: [{ name: 'gameId', paramType: 'uint256', isIndexed: true }],
          eventTopic: 'RoundPlayed(uint256 indexed gameId)',
        },
        {
          params: [{ name: 'gameId', paramType: 'uint256', isIndexed: true }],
          eventTopic: 'GameEnded(uint256 indexed gameId)',
        },
      ]
    )
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    
    // If event schemas are already registered, that's fine - just continue
    if (
      errorMessage.includes('EventSchemaAlreadyRegistered') ||
      errorMessage.includes('already registered') ||
      errorMessage.includes('AlreadyRegistered')
    ) {
      // Event schemas are already registered, which is fine
      return
    }
    
    if (errorMessage.includes('account does not exist') || errorMessage.includes('insufficient funds')) {
      const walletAddress = walletClient.account?.address || 'unknown'
      throw new Error(
        `Account not funded or does not exist on Somnia Testnet. ` +
        `Please fund your wallet (address: ${walletAddress}) with STT tokens from the Somnia faucet. ` +
        `Original error: ${errorMessage}`
      )
    }
    // Event schema registration is less critical, log warning but continue
    console.warn('Failed to register event schemas:', errorMessage)
  }
}

// Create a new game
export async function createGame(gameType: number, stake: bigint, playerAddress: `0x${string}`) {
  const sdk = getSdk(true)
  await ensureSchemasRegistered()
  await ensureEventSchemasRegistered()

  const gameId = BigInt(Date.now()) // Use timestamp as game ID
  const timestamp = Date.now().toString()

  // Encode game creation data
  const gameCreatedEncoder = new SchemaEncoder(gameCreatedSchema)
  const gameCreatedData = gameCreatedEncoder.encodeData([
    { name: 'timestamp', value: timestamp, type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'player1', value: playerAddress, type: 'address' },
    { name: 'stake', value: stake.toString(), type: 'uint256' },
    { name: 'gameType', value: gameType.toString(), type: 'uint8' },
  ])

  // Encode initial game state
  const gameEncoder = new SchemaEncoder(gameSchema)
  const gameData = gameEncoder.encodeData([
    { name: 'timestamp', value: timestamp, type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'player1', value: playerAddress, type: 'address' },
    { name: 'player2', value: '0x0000000000000000000000000000000000000000', type: 'address' },
    { name: 'stake', value: stake.toString(), type: 'uint256' },
    { name: 'gameType', value: gameType.toString(), type: 'uint8' },
    { name: 'roundsPlayed', value: '0', type: 'uint8' },
    { name: 'scores', value: [0, 0], type: 'uint8[2]' },
    { name: 'currentChoices', value: [0, 0], type: 'uint8[2]' },
    { name: 'isActive', value: true, type: 'bool' },
    { name: 'lastPlayerMove', value: '0x0000000000000000000000000000000000000000', type: 'address' },
  ])

  const gameIdHex = toHex(gameId.toString(), { size: 32 })
  const gameCreatedKey = toHex(`created-${gameId}`, { size: 32 })
  const gameStateKey = toHex(`game-${gameId}`, { size: 32 })

  const gameCreatedSchemaId = await sdk.streams.computeSchemaId(gameCreatedSchema)
  const gameSchemaId = await sdk.streams.computeSchemaId(gameSchema)

  if (!gameCreatedSchemaId || !gameSchemaId) {
    throw new Error('Failed to compute schema IDs')
  }

  // Emit event topics
  const eventTopics = [toHex(gameId.toString(), { size: 32 })]

  const tx = await sdk.streams.setAndEmitEvents(
    [
      { id: gameCreatedKey, schemaId: gameCreatedSchemaId, data: gameCreatedData },
      { id: gameStateKey, schemaId: gameSchemaId, data: gameData },
    ],
    [
      {
        id: GAME_CREATED_EVENT_ID,
        argumentTopics: eventTopics,
        data: '0x' as `0x${string}`,
      },
    ]
  )

  if (!tx) throw new Error('Failed to create game')

  await waitForTransactionReceipt(getPublicClient(), { hash: tx as Hex })

  return { gameId: gameId.toString(), txHash: tx }
}

// Join a game
export async function joinGame(
  gameId: bigint,
  player2Address: `0x${string}`,
  stake: bigint
) {
  const sdk = getSdk(true)
  await ensureSchemasRegistered()
  await ensureEventSchemasRegistered()

  // First, fetch current game state
  const gameState = await getGameById(gameId)
  if (!gameState) {
    throw new Error('Game not found')
  }
  if (!gameState.isActive) {
    throw new Error('Game is not active')
  }
  if (gameState.players[1] !== '0x0000000000000000000000000000000000000000') {
    throw new Error('Game is full')
  }
  if (BigInt(gameState.stake.toString()) !== stake) {
    throw new Error('Incorrect stake amount')
  }

  const timestamp = Date.now().toString()

  // Encode game join data
  const gameJoinedEncoder = new SchemaEncoder(gameJoinedSchema)
  const gameJoinedData = gameJoinedEncoder.encodeData([
    { name: 'timestamp', value: timestamp, type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'player2', value: player2Address, type: 'address' },
  ])

  // Update game state
  const gameEncoder = new SchemaEncoder(gameSchema)
  const gameData = gameEncoder.encodeData([
    { name: 'timestamp', value: timestamp, type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'player1', value: gameState.players[0], type: 'address' },
    { name: 'player2', value: player2Address, type: 'address' },
    { name: 'stake', value: stake.toString(), type: 'uint256' },
    { name: 'gameType', value: gameState.gameType.toString(), type: 'uint8' },
    { name: 'roundsPlayed', value: gameState.roundsPlayed.toString(), type: 'uint8' },
    { name: 'scores', value: gameState.scores, type: 'uint8[2]' },
    { name: 'currentChoices', value: gameState.choices, type: 'uint8[2]' },
    { name: 'isActive', value: gameState.isActive, type: 'bool' },
    { name: 'lastPlayerMove', value: gameState.lastPlayerMove, type: 'address' },
  ])

  const gameJoinedKey = toHex(`joined-${gameId}`, { size: 32 })
  const gameStateKey = toHex(`game-${gameId}`, { size: 32 })

  const gameJoinedSchemaId = await sdk.streams.computeSchemaId(gameJoinedSchema)
  const gameSchemaId = await sdk.streams.computeSchemaId(gameSchema)

  if (!gameJoinedSchemaId || !gameSchemaId) {
    throw new Error('Failed to compute schema IDs')
  }

  const eventTopics = [toHex(gameId.toString(), { size: 32 })]

  const tx = await sdk.streams.setAndEmitEvents(
    [
      { id: gameJoinedKey, schemaId: gameJoinedSchemaId, data: gameJoinedData },
      { id: gameStateKey, schemaId: gameSchemaId, data: gameData },
    ],
    [
      {
        id: GAME_JOINED_EVENT_ID,
        argumentTopics: eventTopics,
        data: '0x' as `0x${string}`,
      },
    ]
  )

  if (!tx) throw new Error('Failed to join game')

  await waitForTransactionReceipt(getPublicClient(), { hash: tx as Hex })

  return { txHash: tx }
}

// Make a move
export async function makeMove(
  gameId: bigint,
  playerAddress: `0x${string}`,
  choice: number
) {
  const sdk = getSdk(true)
  await ensureSchemasRegistered()
  await ensureEventSchemasRegistered()

  if (choice < 1 || choice > 3) {
    throw new Error('Invalid choice')
  }

  // Fetch current game state
  const gameState = await getGameById(gameId)
  if (!gameState) {
    throw new Error('Game not found')
  }
  if (!gameState.isActive) {
    throw new Error('Game is not active')
  }

  const playerIndex = gameState.players[0].toLowerCase() === playerAddress.toLowerCase() ? 0 : 1
  if (gameState.players[playerIndex].toLowerCase() !== playerAddress.toLowerCase()) {
    throw new Error('Not a player in this game')
  }
  if (gameState.choices[playerIndex] !== 0) {
    throw new Error('Choice already made')
  }
  if (gameState.lastPlayerMove.toLowerCase() === playerAddress.toLowerCase()) {
    throw new Error('Cannot make two moves in a row')
  }

  const timestamp = Date.now().toString()
  const roundNumber = gameState.roundsPlayed + 1

  // Update choices
  const newChoices = [...gameState.choices]
  newChoices[playerIndex] = choice

  // Encode move data
  const moveEncoder = new SchemaEncoder(moveSchema)
  const moveData = moveEncoder.encodeData([
    { name: 'timestamp', value: timestamp, type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'player', value: playerAddress, type: 'address' },
    { name: 'choice', value: choice.toString(), type: 'uint8' },
    { name: 'roundNumber', value: roundNumber.toString(), type: 'uint8' },
  ])

  // Update game state
  const gameEncoder = new SchemaEncoder(gameSchema)
  const gameData = gameEncoder.encodeData([
    { name: 'timestamp', value: timestamp, type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'player1', value: gameState.players[0], type: 'address' },
    { name: 'player2', value: gameState.players[1], type: 'address' },
    { name: 'stake', value: gameState.stake.toString(), type: 'uint256' },
    { name: 'gameType', value: gameState.gameType.toString(), type: 'uint8' },
    { name: 'roundsPlayed', value: gameState.roundsPlayed.toString(), type: 'uint8' },
    { name: 'scores', value: gameState.scores, type: 'uint8[2]' },
    { name: 'currentChoices', value: newChoices, type: 'uint8[2]' },
    { name: 'isActive', value: gameState.isActive, type: 'bool' },
    { name: 'lastPlayerMove', value: playerAddress, type: 'address' },
  ])

  const moveKeyString = `move-${gameId}-${playerAddress}-${timestamp}`
  const moveKey = keccak256(stringToHex(moveKeyString)) as `0x${string}`
  const gameStateKey = toHex(`game-${gameId}`, { size: 32 })

  const moveSchemaId = await sdk.streams.computeSchemaId(moveSchema)
  const gameSchemaId = await sdk.streams.computeSchemaId(gameSchema)

  if (!moveSchemaId || !gameSchemaId) {
    throw new Error('Failed to compute schema IDs')
  }

  const eventTopics = [toHex(gameId.toString(), { size: 32 })]

  const tx = await sdk.streams.setAndEmitEvents(
    [
      { id: moveKey, schemaId: moveSchemaId, data: moveData },
      { id: gameStateKey, schemaId: gameSchemaId, data: gameData },
    ],
    [
      {
        id: PLAYER_MOVED_EVENT_ID,
        argumentTopics: eventTopics,
        data: '0x' as `0x${string}`,
      },
    ]
  )

  if (!tx) throw new Error('Failed to make move')

  await waitForTransactionReceipt(getPublicClient(), { hash: tx as Hex })

  // Check if both players have moved, then resolve round
  if (newChoices[0] !== 0 && newChoices[1] !== 0) {
    await resolveRound(gameId, gameState)
  }

  return { txHash: tx }
}

// Resolve a round
async function resolveRound(gameId: bigint, gameState: Game) {
  const sdk = getSdk(true)
  await ensureSchemasRegistered()
  await ensureEventSchemasRegistered()

  const player1Choice = gameState.choices[0]
  const player2Choice = gameState.choices[1]
  const roundNumber = gameState.roundsPlayed + 1

  // Determine winner
  let winnerIndex = 255 // 255 = tie
  if (player1Choice !== player2Choice) {
    if (
      (player1Choice === 1 && player2Choice === 3) || // Rock beats Scissors
      (player1Choice === 2 && player2Choice === 1) || // Paper beats Rock
      (player1Choice === 3 && player2Choice === 2)     // Scissors beats Paper
    ) {
      winnerIndex = 0
    } else {
      winnerIndex = 1
    }
  }

  // Update scores
  const newScores = [...gameState.scores]
  if (winnerIndex === 0) {
    newScores[0]++
  } else if (winnerIndex === 1) {
    newScores[1]++
  }

  const newRoundsPlayed = roundNumber

  // Encode round result
  const roundResultEncoder = new SchemaEncoder(roundResultSchema)
  const roundResultData = roundResultEncoder.encodeData([
    { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'roundNumber', value: roundNumber.toString(), type: 'uint8' },
    { name: 'player1Choice', value: player1Choice.toString(), type: 'uint8' },
    { name: 'player2Choice', value: player2Choice.toString(), type: 'uint8' },
    { name: 'winnerIndex', value: winnerIndex.toString(), type: 'uint8' },
  ])

  // Check if game is over
  const isGameOver = checkGameOver(gameState.gameType, newScores, newRoundsPlayed)

  // Update game state
  const gameEncoder = new SchemaEncoder(gameSchema)
  const gameData = gameEncoder.encodeData([
    { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
    { name: 'gameId', value: gameId.toString(), type: 'uint256' },
    { name: 'player1', value: gameState.players[0], type: 'address' },
    { name: 'player2', value: gameState.players[1], type: 'address' },
    { name: 'stake', value: gameState.stake.toString(), type: 'uint256' },
    { name: 'gameType', value: gameState.gameType.toString(), type: 'uint8' },
    { name: 'roundsPlayed', value: newRoundsPlayed.toString(), type: 'uint8' },
    { name: 'scores', value: newScores, type: 'uint8[2]' },
    { name: 'currentChoices', value: [0, 0], type: 'uint8[2]' }, // Reset choices
    { name: 'isActive', value: !isGameOver, type: 'bool' },
    { name: 'lastPlayerMove', value: '0x0000000000000000000000000000000000000000', type: 'address' },
  ])

  const roundResultKey = toHex(`round-${gameId}-${roundNumber}`, { size: 32 })
  const gameStateKey = toHex(`game-${gameId}`, { size: 32 })

  const roundResultSchemaId = await sdk.streams.computeSchemaId(roundResultSchema)
  const gameSchemaId = await sdk.streams.computeSchemaId(gameSchema)

  if (!roundResultSchemaId || !gameSchemaId) {
    throw new Error('Failed to compute schema IDs')
  }

  const eventTopics = [toHex(gameId.toString(), { size: 32 })]

  const dataStreams = [
    { id: roundResultKey, schemaId: roundResultSchemaId, data: roundResultData },
    { id: gameStateKey, schemaId: gameSchemaId, data: gameData },
  ]

  const eventStreams = [
    {
      id: ROUND_PLAYED_EVENT_ID,
      argumentTopics: eventTopics,
      data: '0x' as `0x${string}`,
    },
  ]

  // If game is over, emit game end event
  if (isGameOver) {
    const winner = newScores[0] > newScores[1] 
      ? gameState.players[0] 
      : newScores[1] > newScores[0] 
      ? gameState.players[1] 
      : '0x0000000000000000000000000000000000000000'
    
    const payout = winner === '0x0000000000000000000000000000000000000000'
      ? BigInt(0)
      : BigInt(gameState.stake.toString()) * BigInt(2) * BigInt(9500) / BigInt(10000) // 5% fee

    const gameEndEncoder = new SchemaEncoder(gameEndSchema)
    const gameEndData = gameEndEncoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'gameId', value: gameId.toString(), type: 'uint256' },
      { name: 'winner', value: winner, type: 'address' },
      { name: 'payout', value: payout.toString(), type: 'uint256' },
      { name: 'finalScores', value: newScores, type: 'uint8[2]' },
    ])

    const gameEndSchemaId = await sdk.streams.computeSchemaId(gameEndSchema)
    if (!gameEndSchemaId) throw new Error('Failed to compute game end schema ID')

    const gameEndKey = toHex(`end-${gameId}`, { size: 32 })
    dataStreams.push({ id: gameEndKey, schemaId: gameEndSchemaId, data: gameEndData })
    eventStreams.push({
      id: GAME_ENDED_EVENT_ID,
      argumentTopics: eventTopics,
      data: '0x' as `0x${string}`,
    })
  }

  const tx = await sdk.streams.setAndEmitEvents(dataStreams, eventStreams)
  if (!tx) throw new Error('Failed to resolve round')

  await waitForTransactionReceipt(getPublicClient(), { hash: tx as Hex })

  return { txHash: tx }
}

// Check if game is over
function checkGameOver(gameType: number, scores: number[], roundsPlayed: number): boolean {
  if (gameType === 0) { // OneRound
    return roundsPlayed >= 1
  } else if (gameType === 1) { // BestOfThree
    return scores[0] >= 2 || scores[1] >= 2
  } else { // BestOfFive
    return scores[0] >= 3 || scores[1] >= 3
  }
}

// Get player moves for a game
async function getPlayerMoves(gameId: bigint, playerAddress: string): Promise<number[]> {
  const sdk = getSdk(false)
  let publisher = getPublisherAddress()
  
  if (!publisher) {
    publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | null
  }
  if (!publisher) return []

  const moveSchemaId = await sdk.streams.computeSchemaId(moveSchema)
  if (!moveSchemaId) return []

  try {
    const allMoves = await sdk.streams.getAllPublisherDataForSchema(moveSchemaId, publisher)
    if (!allMoves || !Array.isArray(allMoves)) return []

    const moves: { round: number; choice: number }[] = []
    for (const row of allMoves) {
      if (Array.isArray(row) && row.length >= 5) {
        const moveGameId = BigInt(String(row[1]?.value?.value ?? row[1]?.value ?? '0'))
        const movePlayer = String(row[2]?.value?.value ?? row[2]?.value ?? '').toLowerCase()
        const choice = Number(row[3]?.value?.value ?? row[3]?.value ?? 0)
        const roundNumber = Number(row[4]?.value?.value ?? row[4]?.value ?? 0)
        
        if (moveGameId === gameId && movePlayer === playerAddress.toLowerCase()) {
          moves.push({ round: roundNumber, choice })
        }
      }
    }
    
    // Sort by round number and return choices
    return moves.sort((a, b) => a.round - b.round).map(m => m.choice)
  } catch (error) {
    console.error('Error fetching player moves:', error)
    return []
  }
}

// Get game by ID
export async function getGameById(gameId: bigint): Promise<Game | null> {
  const sdk = getSdk(false)
  let publisher = getPublisherAddress()
  
  // Fallback to env variable if wallet client unavailable
  if (!publisher) {
    publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | null
  }
  
  if (!publisher) {
    throw new Error('Publisher address not configured. Set NEXT_PUBLIC_PUBLISHER_ADDRESS in environment variables.')
  }

  const gameSchemaId = await sdk.streams.computeSchemaId(gameSchema)
  if (!gameSchemaId) return null

  const gameStateKey = toHex(`game-${gameId}`, { size: 32 })
  const data = await sdk.streams.getByKey(gameSchemaId, publisher, gameStateKey)

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null
  }

  const decoded = data[0] as any[]
  if (!Array.isArray(decoded) || decoded.length < 11) {
    return null
  }

  const getValue = (field: any) => field?.value?.value ?? field?.value

  const player1Address = String(getValue(decoded[2]) || '')
  const player2Address = String(getValue(decoded[3]) || '')

  // Fetch player moves
  const player1Moves = await getPlayerMoves(gameId, player1Address)
  const player2Moves = player2Address !== '0x0000000000000000000000000000000000000000' 
    ? await getPlayerMoves(gameId, player2Address)
    : []

  const scoresValue = getValue(decoded[7])
  const choicesValue = getValue(decoded[8])
  
  const scores = Array.isArray(scoresValue) 
    ? [Number(scoresValue[0] ?? 0), Number(scoresValue[1] ?? 0)]
    : [0, 0]
    
  const choices = Array.isArray(choicesValue)
    ? [Number(choicesValue[0] ?? 0), Number(choicesValue[1] ?? 0)]
    : [0, 0]

  // Safely extract values with defaults
  const gameIdValue = getValue(decoded[1])
  const stakeValue = getValue(decoded[4])
  const gameTypeValue = getValue(decoded[5])
  const roundsPlayedValue = getValue(decoded[6])
  const isActiveValue = getValue(decoded[9])
  const lastPlayerMoveValue = getValue(decoded[10])

  // Validate required fields before converting to BigInt
  if (gameIdValue === undefined || gameIdValue === null) {
    throw new Error('Game ID is missing from game data')
  }
  if (stakeValue === undefined || stakeValue === null) {
    throw new Error('Stake is missing from game data')
  }

  return {
    gameId: BigInt(String(gameIdValue)),
    players: [player1Address, player2Address],
    stake: BigInt(String(stakeValue)),
    gameType: Number(gameTypeValue ?? 0),
    roundsPlayed: Number(roundsPlayedValue ?? 0),
    scores,
    choices,
    isActive: Boolean(isActiveValue ?? false),
    lastPlayerMove: String(lastPlayerMoveValue || '0x0000000000000000000000000000000000000000'),
    player1Moves,
    player2Moves,
  }
}

// Get all games for a user
export async function getUserGames(userAddress: `0x${string}`): Promise<bigint[]> {
  const sdk = getSdk(false)
  const gameCreatedSchemaId = await sdk.streams.computeSchemaId(gameCreatedSchema)
  if (!gameCreatedSchemaId) return []

  let publisher = getPublisherAddress()
  if (!publisher) {
    publisher = process.env.NEXT_PUBLIC_PUBLISHER_ADDRESS as `0x${string}` | null
  }
  if (!publisher) return []

  const allData = await sdk.streams.getAllPublisherDataForSchema(gameCreatedSchemaId, publisher)
  if (!allData || !Array.isArray(allData)) return []

  const gameIds: bigint[] = []
  for (const row of allData) {
    if (Array.isArray(row) && row.length > 0) {
      const player1 = String(row[2]?.value?.value ?? row[2]?.value ?? '')
      const gameId = BigInt(String(row[1]?.value?.value ?? row[1]?.value ?? '0'))
      
      if (player1.toLowerCase() === userAddress.toLowerCase()) {
        gameIds.push(gameId)
      }
    }
  }

  // Also check joined games
  const gameJoinedSchemaId = await sdk.streams.computeSchemaId(gameJoinedSchema)
  if (gameJoinedSchemaId) {
    const joinedData = await sdk.streams.getAllPublisherDataForSchema(gameJoinedSchemaId, publisher)
    if (Array.isArray(joinedData)) {
      for (const row of joinedData) {
        if (Array.isArray(row) && row.length > 0) {
          const player2 = String(row[2]?.value?.value ?? row[2]?.value ?? '')
          const gameId = BigInt(String(row[1]?.value?.value ?? row[1]?.value ?? '0'))
          
          if (player2.toLowerCase() === userAddress.toLowerCase() && !gameIds.includes(gameId)) {
            gameIds.push(gameId)
          }
        }
      }
    }
  }

  return gameIds
}

