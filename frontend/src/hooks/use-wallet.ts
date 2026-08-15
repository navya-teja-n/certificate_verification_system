import { useCallback, useEffect, useState } from 'react';
import { BrowserProvider } from 'ethers';
import { SEPOLIA_CHAIN_ID_HEX, SEPOLIA_NETWORK_PARAMS, getBrowserProvider } from '../utils/contract';

type WalletState = {
  address: string | null;
  chainId: string | null;
  isConnecting: boolean;
  error: string | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnecting: false,
    error: null
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const browserProvider = getBrowserProvider();
      const accounts = (await browserProvider.send('eth_requestAccounts', [])) as string[];
      const network = await browserProvider.getNetwork();
      const chainIdHex = `0x${network.chainId.toString(16)}`;

      if (chainIdHex !== SEPOLIA_CHAIN_ID_HEX) {
        try {
          await browserProvider.send('wallet_switchEthereumChain', [{ chainId: SEPOLIA_CHAIN_ID_HEX }]);
        } catch (switchError) {
          const code = (switchError as { code?: number })?.code;
          if (code === 4902) {
            await browserProvider.send('wallet_addEthereumChain', [SEPOLIA_NETWORK_PARAMS]);
          } else {
            throw switchError;
          }
        }
      }

      setProvider(browserProvider);
      setState({
        address: accounts[0] ?? null,
        chainId: chainIdHex,
        isConnecting: false,
        error: null
      });
    } catch (err) {
      setState({
        address: null,
        chainId: null,
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet'
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setState({ address: null, chainId: null, isConnecting: false, error: null });
  }, []);

  useEffect(() => {
    if (!window.ethereum?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      setState((prev) => ({ ...prev, address: list[0] ?? null }));
    };
    const handleChainChanged = (chainId: unknown) => {
      setState((prev) => ({ ...prev, chainId: chainId as string }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  return { ...state, provider, connect, disconnect };
}
