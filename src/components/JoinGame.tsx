'use client';

import React, { useState } from 'react';
import {
  Search,
  Users,
  Swords,
  RefreshCcw,
} from 'lucide-react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useNetworkInfo } from '../hooks/useNetworkInfo';
import { getGameAPI, joinGameAPI } from '../lib/api/gameApi';
import GameSearchCard from './GameSearchCard';
import toast from 'react-hot-toast';
import { Game } from '../types';
import { ErrorBoundary } from 'react-error-boundary';

export default function JoinGame() {
  const { tokenSymbol } = useNetworkInfo();
  const { address: userAddress } = useAccount();
  const [activeGames, setActiveGames] = useState<Game | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) {
      toast.error('Please enter a game ID');
      return;
    }

    setIsLoading(true);
    try {
      const game = await getGameAPI(searchQuery);
      if (game) {
        setActiveGames(game);
        toast.success('Game found!');
      } else {
        setActiveGames(undefined);
        toast.error('Game not found');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to search game');
      setActiveGames(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async (id: bigint | undefined, stake: bigint | undefined) => {
    if (!id || !stake || !userAddress) {
      toast.error('Missing game information or wallet not connected');
      return;
    }

    const toastId = toast.loading('Preparing to enter Lottie...');
    setIsJoining(true);

    try {
      const stakeAmount = formatEther(stake);
      await joinGameAPI(id.toString(), userAddress, stakeAmount);

      toast.success('You have entered Lottie! 🎮', {
        id: toastId,
        duration: 3000,
        icon: '🔥',
      });

      // Refresh game data
      await handleSearch();
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to join battle',
        {
          id: toastId,
          duration: 3000,
          icon: '❌',
        }
      );
      console.error('Error joining game:', err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className='space-y-6 text-white'>
        {/* Search and Refresh Section */}
        <div className='flex gap-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5' />
            <input
              type='text'
              placeholder='Enter battle ID to join'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white'
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className='p-3 bg-gray-800 border-2 border-gray-700 rounded-lg hover:border-blue-500 transition-all duration-300 hover:bg-blue-500/10 disabled:opacity-50'
          >
            <Search
              className={`w-5 h-5 text-blue-400 ${
                isLoading ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>

        {/* Active Games List */}
        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <h2 className='text-xl font-semibold text-gray-200 flex items-center'>
              <Swords className="w-5 h-5 mr-2 text-blue-400" />
              FIND YOUR BATTLE
            </h2>
          </div>

          <div className='space-y-4'>
            {!activeGames ? (
              <div className='text-center py-8 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-300'>
                <Users className='w-12 h-12 text-gray-600 mx-auto mb-3' />
                <p className='text-gray-400'>No active battles found</p>
                <button
                  onClick={handleSearch}
                  className='mt-4 text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105'
                >
                  <RefreshCcw className='w-4 h-4' />
                  SEARCH FOR BATTLES
                </button>
              </div>
            ) : (
              <GameSearchCard
                game={activeGames}
                isLoading={isJoining}
                onJoinGame={() => handleJoinGame(activeGames?.gameId, activeGames?.stake)}
                userAddress={userAddress}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
