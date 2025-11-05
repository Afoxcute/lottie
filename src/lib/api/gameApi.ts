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
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch game');
  }

  const data = await response.json();
  return data.game || null;
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

