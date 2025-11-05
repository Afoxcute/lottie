# Lottie - Prompt Examples

This document contains examples of prompts used with AI tools (like ChatGPT and GitHub Copilot) throughout the development of Lottie. These prompts show how AI was used to generate code, solve problems, and optimize the project.

## Smart Contract Development Prompts

### Initial Contract Structure
```
I need to build a Rock-Paper-Scissors game using Somnia Data Streams. The game should:
1. Allow users to create games with a stake amount in STT
2. Support multiple game types (single round, best of 3, best of 5)
3. Let other players join games by matching the stake
4. Track player moves and determine winners based on classic RPS rules
5. Keep history of all games and moves
6. Store game state and events using Somnia Data Streams

Please generate the implementation using Somnia SDK with schemas, data streams, and event streams.
```

### Game Logic Implementation
```
I need to implement the game logic for my Rock-Paper-Scissors game using Somnia Data Streams. Specifically, I need functions to:
1. Process player moves (rock, paper, scissors)
2. Determine the winner of each round
3. Track scores across multiple rounds
4. Determine when a game is complete
5. Store game state and events in Somnia Data Streams

Can you provide the implementation using Somnia SDK with proper error handling and data structure design?
```

### Security Review
```
Please review my Lottie game implementation using Somnia Data Streams for potential security vulnerabilities. The game handles user stakes in STT, so I want to ensure:
1. No unauthorized access to game data
2. Players can't cheat by seeing opponent moves first
3. Game state is correctly stored and retrieved
4. No player can manipulate game outcomes

Implementation code:
[Insert code here]
```

## Frontend Development Prompts

### Game Creation Component
```
I need a React component for creating a new Rock-Paper-Scissors game on Somnia Network. The component should:
1. Allow selection of game type (Lightning Duel, Warrior Clash, Epic Tournament)
2. Have a stake amount input with validation
3. Include a "Create Game" button that interacts with Somnia Data Streams
4. Show loading states during data operations
5. Display success/error messages

Use Tailwind CSS for styling with a dark gaming theme, and integrate with Somnia SDK for data stream interactions.
```

### Game Interface Design
```
Design an interactive game interface for playing Rock-Paper-Scissors on the blockchain. The UI should:
1. Show both players' information and scores
2. Have intuitive controls for selecting rock, paper, or scissors
3. Display the current round and game status
4. Show move history and results
5. Include animations for move selection and outcome reveals

The interface should feel modern and gamified while being responsive on mobile devices.
```

### State Management
```
I'm building a blockchain game with Next.js, React, and Wagmi. I need help with state management to:
1. Track game creation and joining status
2. Listen for contract events to update the UI in real-time
3. Handle user authentication and wallet connection
4. Manage loading states during blockchain transactions
5. Store game history for the current user

Can you provide a pattern using React hooks that efficiently manages this state?
```

## Problem-Solving Prompts

### Debugging Transaction Errors
```
I'm getting this error when trying to join a game on Somnia Network:
"ContractFunctionExecutionError: execution reverted: Incorrect stake amount"

Here's my code that's calling the contract:
[Insert code]

How can I fix this issue? The stake amount seems correct according to the UI.
```

### Optimizing Gas Usage
```
My Lottie game implementation is experiencing performance issues. Can you help optimize these functions to reduce operations while maintaining the same functionality?

[Insert implementation functions]

Specifically, I want to focus on the makeMove and resolveRound functions which are called frequently.
```

### UI Performance Issues
```
My game interface is experiencing performance issues, especially when updating the UI after moves are made. I'm using Somnia Data Streams subscriptions and React state, but it's causing re-renders and delays.

Here's my current component structure:
[Insert component code]

How can I optimize this to make the UI more responsive while still keeping it in sync with blockchain events?
```

## Documentation Prompts

### README Creation
```
Generate a comprehensive README.md for my Lottie project, which is a blockchain-based Rock-Paper-Scissors game on Somnia Network. Include:
1. Project overview
2. Features list
3. Technologies used (Next.js, React, Wagmi, Somnia Data Streams)
4. Installation and setup instructions
5. How to play the game
6. Somnia Data Streams architecture details
7. Screenshots or diagrams (describe what these would be)
```

### User Guide
```
Create a user guide explaining how to play Lottie. Include instructions for:
1. Connecting a wallet to the game
2. Creating a new game with stakes
3. Finding and joining existing games
4. Making moves during gameplay
5. Viewing game history and results
6. Understanding different game modes

Make it user-friendly for people who may be new to blockchain games.
``` 