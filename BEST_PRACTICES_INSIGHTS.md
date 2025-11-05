# Best Practices & Insights from Lottie Development

Throughout the development of the Lottie project, we discovered numerous optimization techniques and valuable insights for building blockchain games using Somnia Data Streams. This document shares our key learnings that could help other developers working on similar projects.

## Somnia Data Streams Development

### Data Structure Optimization Insights

#### 1. Efficient Schema Design
**Learning:** The choice of schema structures significantly impacts data retrieval and storage costs.

**Implementation:** 
- We used fixed-size arrays for game state tracking rather than dynamic arrays whenever possible
- For player moves, we used `uint8` types instead of strings, reducing storage costs
- The `GameType` enum allowed us to efficiently represent different game modes

**Impact:** Improved data retrieval performance and reduced storage costs.

#### 2. Minimizing Data Operations
**Learning:** Data stream operations need to be optimized for performance.

**Implementation:**
- Used batch operations for related state changes
- Implemented efficient key generation using hashing
- Used event streams for notifications instead of polling data streams

## Frontend Development

### Blockchain UX Improvements

#### 1. Optimistic UI Updates
**Learning:** Blockchain confirmation times can make apps feel sluggish without proper UX design.

**Implementation:**
- Implemented optimistic UI updates that show expected state changes immediately
- Used loading states with engaging animations during transaction processing
- Provided clear feedback for pending, success, and failure states

**Code Pattern:**
```jsx
const handleAction = async () => {
  // Show optimistic UI update
  setLocalState(newExpectedState);
  setIsLoading(true);
  
  try {
    // Perform Somnia Data Stream operation
    await somniaSDK.streams.setData(/* data stream operation */);
    // Handle success
    toast.success("Action completed!");
  } catch (error) {
    // Revert optimistic update on failure
    setLocalState(previousState);
    toast.error(extractErrorMessages(error));
  } finally {
    setIsLoading(false);
  }
};
```

#### 2. Error Handling
**Learning:** Raw blockchain error messages are cryptic and unhelpful for users.

**Implementation:**
- Created a custom error parser to extract meaningful messages from Somnia SDK errors
- Mapped data stream errors to user-friendly messages
- Used toast notifications with appropriate styling for different error types

### Performance Optimizations

#### 1. Strategic Component Re-rendering
**Learning:** Blockchain state updates can trigger excessive re-renders.

**Implementation:**
- Used React.memo to prevent unnecessary re-renders
- Implemented custom hooks to isolate blockchain data fetching
- Separated UI components from data-fetching logic

**Example:**
```jsx
// Custom hook to isolate blockchain logic
const useGameData = (gameId) => {
  // ... blockchain interaction logic
  return { gameData, isLoading, error };
};

// Pure UI component that only re-renders when props change
const GameDisplay = React.memo(({ gameData }) => {
  // ... render UI based on game data
});

// Container component
const GameContainer = ({ gameId }) => {
  const { gameData, isLoading, error } = useGameData(gameId);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return <GameDisplay gameData={gameData} />;
};
```

#### 2. Efficient Data Stream Handling
**Learning:** Data stream subscriptions need to be handled efficiently to avoid performance issues.

**Implementation:**
- Used specific schema IDs to filter data streams
- Implemented polling for real-time updates instead of complex subscriptions
- Cached data to reduce redundant queries

## Testing and Reliability

### Testing Strategies

#### 1. Smart Contract Testing
**Learning:** Comprehensive testing is essential for blockchain applications.

**Implementation:**
- Used Hardhat for contract testing
- Implemented unit tests for each contract function
- Created integration tests for complete game scenarios
- Simulated edge cases like tied games and invalid moves

#### 2. Frontend Testing
**Learning:** Testing blockchain interactions requires mocking contract responses.

**Implementation:**
- Used vitest for component testing
- Mocked blockchain responses to test UI states
- Created testing utilities for common blockchain operations

## Somnia Network Compatibility

### Somnia-Specific Insights

#### 1. Data Stream Management
**Learning:** Somnia Data Streams require proper schema registration and key management.

**Implementation:**
- Register schemas before using them
- Use deterministic key generation for data streams
- Implement proper error handling for unfunded accounts

#### 2. Network Detection
**Learning:** Supporting multiple networks requires careful handling.

**Implementation:**
- Created a custom hook to detect and manage network connections
- Provided clear guidance when users are on unsupported networks
- Implemented a simple network switching mechanism

## Community and Documentation

### Developer Experience

#### 1. Comprehensive Documentation
**Learning:** Clear documentation is essential for blockchain projects.

**Implementation:**
- Created detailed README files for both frontend and contract
- Added inline code comments explaining complex logic
- Documented all contract events and function parameters

#### 2. User Guides
**Learning:** Users need clear guidance for blockchain interactions.

**Implementation:**
- Created step-by-step guides for common actions
- Included explanations of gas costs and transaction times
- Added tooltips for blockchain-specific concepts

---

These best practices and insights have significantly improved the quality, performance, and user experience of Lottie. We hope they prove valuable for other developers building on Somnia Network or creating blockchain games using data streams. 