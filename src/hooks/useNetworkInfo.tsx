import { useChainId } from 'wagmi';
import { useState, useEffect } from 'react';
import { somniaTestnet } from '../lib/somnia/chain';

export function useNetworkInfo() {
  const chainId = useChainId();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Check if connected to Somnia Testnet
  const isSomniaTestnet = isMounted && chainId === somniaTestnet.id;
  
  // Determine network name based on chain ID
  let networkName = "Unknown Network";
  let networkClass = "bg-gray-900/50 text-gray-400";
  let tokenSymbol = "STT"; // Somnia Testnet Token
  
  if (isSomniaTestnet) {
    networkName = "Somnia Testnet";
    networkClass = "bg-blue-900/50 text-blue-400";
    tokenSymbol = "STT";
  }
  
  return {
    chainId,
    isMainnet: false,
    isTestnet: isSomniaTestnet,
    networkName,
    networkClass,
    tokenSymbol,
    isMounted
  };
} 