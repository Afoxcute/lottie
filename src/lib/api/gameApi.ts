// API client for Somnia Data Streams game operations
import { parseEther } from 'viem';
import type { Game } from '@/types';

const API_BASE = '/api/game';

export async function createGameAPI(
  gameType: number,
  stake: string,
  playerAddress: `0x${string}`
): Promise<{ gameId: string; txHash: string }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'createGame',
      gameType,
      stake,
      playerAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create game');
  }

  return response.json();
}

export async function joinGameAPI(
  gameId: string,
  player2Address: `0x${string}`,
  stake: string
): Promise<{ txHash: string }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'joinGame',
      gameId,
      player2Address,
      stake,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join game');
  }

  return response.json();
}

export async function makeMoveAPI(
  gameId: string,
  playerAddress: `0x${string}`,
  choice: number
): Promise<{ txHash: string }> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'makeMove',
      gameId,
      playerAddress,
      choice,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to make move');
  }

  return response.json();
}

// Helper to deserialize BigInt values from strings
function deserializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deserializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const deserialized: any = {};
    for (const key in obj) {
      // Convert string BigInt fields back to BigInt
      if ((key === 'gameId' || key === 'stake') && typeof obj[key] === 'string') {
        try {
          // Validate that the string is not empty before converting
          if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
            console.warn(`Invalid ${key} value:`, obj[key]);
            deserialized[key] = obj[key];
          } else {
            deserialized[key] = BigInt(obj[key]);
          }
        } catch (error) {
          // If conversion fails, keep original value
          console.warn(`Failed to convert ${key} to BigInt:`, obj[key], error);
          deserialized[key] = obj[key];
        }
      } else {
        deserialized[key] = deserializeBigInt(obj[key]);
      }
    }
    return deserialized;
  }
  
  return obj;
}

export async function getGameAPI(gameId: string): Promise<Game | null> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getGame',
      gameId,
    }),
  });

  if (!response.ok) {
    let errorMessage = 'Failed to fetch game';
    try {
      const error = await response.json();
      errorMessage = error?.error || error?.message || errorMessage;
    } catch {
      // If error response is not JSON, use default message
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error('Invalid JSON response from server');
  }

  if (!data || !data.game) {
    return null;
  }
  
  // Validate required fields before deserializing
  if (data.game.gameId === undefined || data.game.stake === undefined) {
    console.warn('Game data missing required fields:', data.game);
    return null;
  }
  
  // Ensure gameId and stake are strings before deserializing
  if (typeof data.game.gameId !== 'string' || typeof data.game.stake !== 'string') {
    console.warn('Game data has invalid field types:', data.game);
    return null;
  }
  
  // Deserialize BigInt values from strings
  const deserializedGame = deserializeBigInt(data.game) as Game;
  
  // Final validation to ensure BigInt conversion succeeded
  if (typeof deserializedGame.gameId !== 'bigint' || typeof deserializedGame.stake !== 'bigint') {
    console.error('Failed to deserialize BigInt values:', deserializedGame);
    return null;
  }
  
  return deserializedGame;
}

export async function getUserGamesAPI(
  userAddress: `0x${string}`
): Promise<string[]> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'getUserGames',
      userAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user games');
  }

  const data = await response.json();
  return data.gameIds || [];
}

