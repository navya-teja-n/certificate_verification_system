import { Alert, Box, Button, Chip, Link, Stack, Typography } from '@mui/material';
import { AccountBalanceWalletOutlined, OpenInNewOutlined } from '@mui/icons-material';
import { CERTIFICATE_CONTRACT_ADDRESS } from '../utils/contract';

const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

type WalletConnectButtonProps = {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
};

export const WalletConnectButton = ({
  address,
  isConnecting,
  error,
  connect,
  disconnect
}: WalletConnectButtonProps) => {
  return (
    <Box>
      <Stack direction='row' spacing={2} alignItems='center'>
        {address ? (
          <>
            <Chip
              icon={<AccountBalanceWalletOutlined />}
              label={shortenAddress(address)}
              color='success'
              variant='outlined'
            />
            <Button size='small' onClick={disconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            variant='contained'
            startIcon={<AccountBalanceWalletOutlined />}
            onClick={connect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        )}
      </Stack>
      {error && (
        <Alert severity='error' sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {!address && (
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
          Connect a MetaMask wallet on Sepolia testnet to issue or verify certificates.
        </Typography>
      )}
      {CERTIFICATE_CONTRACT_ADDRESS && (
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
          Contract:{' '}
          <Link
            href={`https://sepolia.etherscan.io/address/${CERTIFICATE_CONTRACT_ADDRESS}`}
            target='_blank'
            rel='noopener noreferrer'
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}
          >
            {shortenAddress(CERTIFICATE_CONTRACT_ADDRESS)}
            <OpenInNewOutlined sx={{ fontSize: 12 }} />
          </Link>
        </Typography>
      )}
    </Box>
  );
};
