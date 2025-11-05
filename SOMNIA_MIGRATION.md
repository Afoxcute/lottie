# Somnia Data Streams Integration

This project has been migrated from a Solidity smart contract to use Somnia Data Streams for storing game state and events.

## Architecture

Instead of a traditional smart contract, game state is stored on-chain using Somnia Data Streams:
- **Game State**: Stored as structured data streams with a schema
- **Events**: Emitted via Somnia event streams for reactivity
- **No Contract Deployment**: All logic runs via TypeScript SDK

## Setup

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Somnia RPC URL
RPC_URL=https://dream-rpc.somnia.network

# Server-side private key (for publishing game state)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Publisher address (public, can be shared - used for reading data)
NEXT_PUBLIC_PUBLISHER_ADDRESS=0xYOUR_PUBLISHER_ADDRESS_HERE
```

### Getting Started

1. **Fund Your Wallet**: Get testnet tokens from Somnia faucet
2. **Set Environment Variables**: Add the above variables to `.env.local`
3. **Run the App**: `npm run dev` or `yarn dev`

## How It Works

### Game Creation
1. Player calls API route `/api/game` with action `createGame`
2. Server publishes game state to Somnia Data Streams
3. Emits `GameCreated` event for reactivity
4. Returns game ID

### Joining a Game
1. Player calls API route `/api/game` with action `joinGame`
2. Server validates game state and updates it
3. Emits `GameJoined` event
4. Player must send stake via native transfer (handled separately)

### Making Moves
1. Player calls API route `/api/game` with action `makeMove`
2. Server publishes move to data streams
3. When both players have moved, round is resolved automatically
4. Emits `RoundPlayed` and potentially `GameEnded` events

### Reading Game Data
- Client-side: Uses `getGameByIdClient()` from `gameServiceClient.ts`
- Server-side: Uses `getGameById()` from `gameService.ts`
- Both read from the same publisher address

## Schemas

Game data is structured using these schemas:

- **gameSchema**: Full game state (players, scores, choices, etc.)
- **gameCreatedSchema**: Game creation event
- **gameJoinedSchema**: Game join event
- **moveSchema**: Individual player moves
- **roundResultSchema**: Round outcomes
- **gameEndSchema**: Final game results

## Payment Handling

⚠️ **Important**: Unlike the smart contract, payments are not automatically handled. You need to:

1. **Option A**: Implement a separate escrow contract for handling stakes
2. **Option B**: Use native transfers before/after game actions
3. **Option C**: Integrate with a payment service

Currently, players must send stakes manually via wallet transactions. The game state tracks stake amounts but doesn't automatically transfer funds.

## Migration Notes

### Differences from Smart Contract

1. **No Automatic Payments**: Payments must be handled separately
2. **Centralized Publisher**: All game state is published by server account
3. **Event-Based Updates**: Use Somnia subscriptions for real-time updates
4. **Schema-Based**: Data structure defined by schemas, not contract storage

### Benefits

1. **No Deployment**: No need to deploy/upgrade contracts
2. **Flexible Schemas**: Easy to extend game data structure
3. **Composability**: Data streams can be shared across applications
4. **Real-time**: Built-in reactivity via event streams

## API Routes

### POST `/api/game`

Actions:
- `createGame`: Create a new game
- `joinGame`: Join an existing game
- `makeMove`: Make a move in a game
- `getGame`: Get game by ID
- `getUserGames`: Get all games for a user

Example:
```typescript
const response = await fetch('/api/game', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'createGame',
    gameType: 0,
    stake: '0.1',
    playerAddress: '0x...'
  })
})
```

## Next Steps

1. Implement payment escrow contract or payment service
2. Add real-time subscriptions for game updates
3. Optimize data fetching with caching
4. Add game history aggregation

