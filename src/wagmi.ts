import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from 'wagmi';
import { somniaTestnet } from './lib/somnia/chain';

export const config = getDefaultConfig({
  appName: 'Lottie',
  projectId: '2c22698ed6fa65b5ab4a6acb4af0b952',
  chains: [somniaTestnet],
  ssr: true,
  transports: {
    [somniaTestnet.id]: http(
      'https://dream-rpc.somnia.network'
    ),
  },
});
