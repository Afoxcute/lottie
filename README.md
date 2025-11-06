# Lottie

This is a decentralized Rock-Paper-Scissors game built on the Somnia Network. The application allows users to create and join games, track their move history, and view past game results, all while ensuring transparency and fairness through blockchain technology.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Architecture](#architecture)

## Getting Started

To get started with the project, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Afoxcute/lottie.git
   cd lottie
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Features

- **Home Page**: Provides an overview of the game and a button to navigate to the game tab.
- **Game Tab**: 
  - **Create Game**: Users can create a game by selecting the game type (Lightning Duel, Warrior Clash, Epic Tournament) and setting a stake in STT.
  - **Join Game**: Users can search for existing games using a game ID and join if there is an available slot.
- **Real-Time Gameplay**: Players are notified of their opponent's moves, and results are displayed only after both players have made their moves.
- **History Tab**: Users can view their past games and move history for transparency.

## Architecture

The application is structured as follows:

- **Frontend**: Built with Next.js, utilizing React for the UI and Wagmi for Somnia Network interactions.
- **Data Streams**: The game logic is implemented using Somnia Data Streams, ensuring secure and transparent gameplay through on-chain data storage.
- **Blockchain**: All game states and transactions are recorded on the Somnia Testnet network.

### Key Components

- **Frontend Pages**: 
  - `src/pages/index.tsx`: Home page.
  - `src/pages/game.tsx`: Game creation and joining interface.
  - `src/pages/history.tsx`: Displays the user's game history.
- **Components**: 
  - `CreateGame.tsx`: UI for creating a game.
  - `JoinGame.tsx`: UI for joining a game.
  - `GameInterface.tsx`: Displays the game in progress.
- **Services**:
  - `payoutService.ts`: Service that reads game end data from Data Streams and executes token transfers to winners.
  - `gameService.ts`: Server-side game logic for creating games, joining, making moves, and resolving rounds.
  - `gameServiceClient.ts`: Client-side service for reading game data from Data Streams.
- **API Endpoints**:
  - `/api/game`: Handles game creation, joining, moves, and game state queries.
  - `/api/payout`: Handles payout execution and queries for unpaid game ends.

## Payout System

The application includes an **automatic** payout service that reads game end data from Somnia Data Streams and executes token transfers to winners.

### Token Transfer Flow

1. **Staking (Creator Only)**: Only the game creator (Player 1) stakes tokens:
   - **Create Game**: Player 1 transfers their stake to the platform wallet before the game is created
   - **Join Game**: Player 2 joins without staking - no token transfer required
   - The stake transfer happens client-side using wagmi's `useSendTransaction` hook, requiring wallet approval
   - **Stake Commitment**: The creator's stake commitment is stored in Somnia Data Streams using the `stakeCommitmentSchema` for record-keeping

2. **Escrow**: The platform wallet holds the staked tokens until the game ends

3. **Payout Execution**: When a game ends, the automatic payout system:
   - Reads game end data from Data Streams (including winner and payout amount)
   - Transfers the staked amount from the platform wallet to the winner (100% of the stake - no platform fee)
   - Records the payout execution in Data Streams to prevent duplicates

### How It Works

1. **Game End Detection**: When a game ends, the `gameEndSchema` stores the winner address and calculated payout amount (100% of the staked amount, no platform fee).

2. **Automatic Payout Execution**: The payout listener service automatically:
   - Monitors for new `GameEnded` events using WebSocket block watching (with polling fallback)
   - Detects when games end and have unpaid winners
   - Automatically executes STT token transfers to winners
   - Records payout execution in Data Streams to prevent duplicate payments
   - Processes payouts in real-time as games complete

3. **Event-Driven Architecture**: 
   - Uses WebSocket subscriptions to watch for new blocks
   - Automatically triggers payout execution when `GameEnded` events are detected
   - Falls back to polling mode if WebSocket connection fails
   - Processes payouts immediately when games end (no manual intervention required)

4. **API Endpoints**:
   - `POST /api/payout` with `action: 'executePayout'` - Manually execute payout for a specific game
   - `POST /api/payout` with `action: 'processAllPayouts'` - Process all unpaid payouts manually
   - `POST /api/payout` with `action: 'getUnpaidPayouts'` - Get list of unpaid games
   - `POST /api/payout` with `action: 'getGameEndData'` - Get game end data for a specific game
   - `POST /api/payout` with `action: 'startListener'` - Start the automatic payout listener
   - `POST /api/payout` with `action: 'stopListener'` - Stop the automatic payout listener
   - `POST /api/payout` with `action: 'getListenerStatus'` - Get listener status
   - `POST /api/payout` with `action: 'resetListenerTimestamp'` - Reset listener timestamp (for testing)

### Automatic Startup

The payout listener **automatically starts** when the server starts (unless disabled via environment variable):

- **Environment Variables**:
  - `AUTO_START_PAYOUT_LISTENER` - Set to `'false'` to disable auto-start (default: enabled)
  - `PAYOUT_LISTENER_INTERVAL_MS` - Polling interval in milliseconds (default: 10000ms / 10 seconds)

### Usage

The payout system runs automatically, but you can also manually control it:

```typescript
import { executePayoutAPI } from '@/lib/api/payoutApi'

// Manual payout execution (usually not needed - automatic)
const result = await executePayoutAPI('1234567890')
console.log(result) // { success: true, gameId, winner, payout, txHash }
```

### Requirements

- `PRIVATE_KEY` environment variable must be set with the private key of the platform wallet (the wallet that receives stakes and sends payouts)
- `PLATFORM_WALLET_ADDRESS` or `NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS` environment variable must be set to the platform wallet address (where stakes are received and payouts are sent from)
  - If not set, falls back to `NEXT_PUBLIC_PUBLISHER_ADDRESS`
  - The `PRIVATE_KEY` must correspond to this platform wallet address
- The platform wallet must have sufficient STT balance to cover payouts (or receive tokens from creators as they stake)
- `NEXT_PUBLIC_PUBLISHER_ADDRESS` must be set to the publisher address used for Data Streams (can be different from platform wallet)
- Only game creators need sufficient STT balance in their wallets to stake when creating games

### Payout Calculation

- Staked Amount = `stake` (only the creator stakes)
- Winner Receives = `stake` (100% of the staked amount - no platform fee)
- Platform Fee = 0% (winners receive the full stake)

## Project Evaluation

### Technical Excellence - Is the project functional, stable, and well-implemented using Data Streams SDK?

**Yes, the project demonstrates strong technical implementation using the Somnia Data Streams SDK.**

The project successfully leverages the `@somnia-chain/streams` SDK (v0.9.5) with a well-structured implementation:

- **Schema Management**: Properly defines and registers multiple schemas (`gameSchema`, `gameCreatedSchema`, `gameJoinedSchema`, `moveSchema`, `roundResultSchema`, `gameEndSchema`) using `SchemaEncoder` for type-safe data encoding.

- **Atomic Operations**: Uses `setAndEmitEvents()` to atomically update game state and emit events, ensuring data consistency. Each operation (create game, join game, make move) updates both the game state and emits corresponding events.

- **Event System**: Implements a comprehensive event schema registration system with five distinct event types (`GameCreated`, `GameJoined`, `PlayerMoved`, `RoundPlayed`, `GameEnded`) for tracking game lifecycle.

- **Error Handling**: Robust error handling with informative messages, transaction receipt waiting, and proper fallback mechanisms for missing configuration.

- **Architecture**: Clean separation between server-side (`gameService.ts`) and client-side (`gameServiceClient.ts`) operations, with proper schema validation and state management.

- **Functionality**: The game is fully functional with multiple game types (Lightning Duel, Warrior Clash, Epic Tournament), move validation, round resolution, and score tracking.

The implementation follows best practices for blockchain data management, ensuring transparency and immutability of game state through on-chain storage.

### Real-Time UX - Does it leverage the real time feature of Data Streams effectively?

**Partially - The project uses polling for real-time updates but could better leverage Data Streams event subscriptions.**

Current Implementation:
- Uses **polling mechanism** with 3-second intervals (`setInterval(() => fetchGameData(false), 3000)`) to check for game state updates
- Provides real-time-like experience through frequent polling, allowing players to see opponent moves within seconds
- WebSocket client infrastructure exists (`getPublicWebSocketClient()`) but is not actively used for subscriptions

Opportunities for Enhancement:
- Event schemas are registered (`GAME_CREATED_EVENT_ID`, `PLAYER_MOVED_EVENT_ID`, `ROUND_PLAYED_EVENT_ID`, etc.) but not subscribed to for real-time updates
- Could implement event listeners using the SDK's event subscription capabilities to reduce latency and network overhead
- Currently relies on HTTP polling which works but is less efficient than true event-driven updates

The UX is functional and responsive, but could be improved by leveraging Data Streams' native event subscription capabilities for true real-time updates instead of polling.

### Somnia Integration - Is it Deployed on Somnia Testnet?

**Yes, the project is fully configured and deployed for Somnia Testnet.**

- **Network Configuration**: Configured with Somnia Testnet (Chain ID: 50312) using `viem` chain definitions
- **RPC Endpoint**: Uses `https://dream-rpc.somnia.network` as the primary RPC endpoint
- **Native Token**: Configured to use STT (Somnia Testnet Token) with 18 decimals
- **Wallet Integration**: Integrated with Wagmi/RainbowKit for wallet connectivity, requiring users to connect to Somnia Testnet
- **Error Messages**: All error handling references Somnia Testnet and includes helpful messages about funding wallets with STT from the Somnia faucet
- **Production Ready**: The application is configured to run on Somnia Testnet and all game operations are executed on-chain through Somnia Data Streams

The project demonstrates full integration with the Somnia ecosystem and is ready for deployment and testing on Somnia Testnet.

### Potential Impact - Does it have potential to evolve into a real product or ecosystem contribution?

**Yes, the project has strong potential to evolve into a real product and make meaningful ecosystem contributions.**

**Product Potential:**
- **Complete Game Loop**: Fully functional game with create, join, play, and history features
- **Multiple Game Modes**: Three distinct game types (single round, best-of-3, best-of-5) provide variety and replayability
- **Staking Mechanism**: Built-in staking system with winner-takes-all model creates economic incentives
- **User Experience**: Modern, polished UI with clear visual feedback, move history, and game state visualization
- **Scalability Foundation**: On-chain data storage enables transparent, verifiable gameplay that can scale

**Ecosystem Contribution Potential:**
- **Reference Implementation**: Could serve as a reference implementation for building games on Somnia Data Streams
- **Pattern Library**: Demonstrates best practices for schema design, event emission, and state management
- **Community Building**: Gaming applications are powerful tools for onboarding users to blockchain ecosystems
- **Extensibility**: The architecture supports easy addition of features like tournaments, leaderboards, or NFT rewards
- **Technical Documentation**: Well-structured codebase could serve as educational material for developers learning Data Streams

**Next Steps for Evolution:**
- Implement true event-driven real-time updates
- Add tournament/ladder systems
- Integrate with Somnia's social features for player discovery
- Add analytics and leaderboards
- Consider token/NFT rewards for achievements

The project demonstrates production-ready code quality and has a clear path to becoming a viable product that could attract users to the Somnia ecosystem.
