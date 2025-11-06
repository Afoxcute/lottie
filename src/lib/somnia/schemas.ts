// Game schemas for Somnia Data Streams

// Base game schema - stores game state
export const gameSchema = 
  'uint64 timestamp, uint256 gameId, address player1, address player2, uint256 stake, uint8 gameType, uint8 roundsPlayed, uint8[2] scores, uint8[2] currentChoices, bool isActive, address lastPlayerMove'

// Game creation schema - event when game is created
export const gameCreatedSchema = 
  'uint64 timestamp, uint256 gameId, address player1, uint256 stake, uint8 gameType'

// Game join schema - event when player joins
export const gameJoinedSchema = 
  'uint64 timestamp, uint256 gameId, address player2'

// Stake commitment schema - stores player stake commitments in Data Streams
export const stakeCommitmentSchema = 
  'uint64 timestamp, uint256 gameId, address player, uint256 stakeAmount, bool isCommitted'

// Move schema - stores player moves
export const moveSchema = 
  'uint64 timestamp, uint256 gameId, address player, uint8 choice, uint8 roundNumber'

// Round result schema - stores round outcomes
export const roundResultSchema = 
  'uint64 timestamp, uint256 gameId, uint8 roundNumber, uint8 player1Choice, uint8 player2Choice, uint8 winnerIndex'

// Game end schema - stores final game result
export const gameEndSchema = 
  'uint64 timestamp, uint256 gameId, address winner, uint256 payout, uint8[2] finalScores'

// Game history schema - tracks all moves per player
export const gameHistorySchema = 
  'uint64 timestamp, uint256 gameId, address player, uint8[] moves'

// Payout executed schema - tracks which payouts have been processed
export const payoutExecutedSchema = 
  'uint64 timestamp, uint256 gameId, address winner, uint256 payout, bytes32 txHash'

// Event schema IDs for reactivity
export const GAME_CREATED_EVENT_ID = 'GameCreated'
export const GAME_JOINED_EVENT_ID = 'GameJoined'
export const PLAYER_MOVED_EVENT_ID = 'PlayerMoved'
export const ROUND_PLAYED_EVENT_ID = 'RoundPlayed'
export const GAME_ENDED_EVENT_ID = 'GameEnded'

