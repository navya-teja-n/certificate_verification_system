import * as React from 'react';
import { AppBar, Box, Container, Grid2, Paper, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { WorkspacePremiumOutlined } from '@mui/icons-material';
import { blue } from '@mui/material/colors';
import { useWallet } from '../hooks/use-wallet';
import {
  WalletConnectButton,
  IssueCertificateForm,
  CertificateVerifier,
  ManageAccess,
  RecentCertificatesAside,
  DeploymentOverview,
  AboutOverview
} from '../components';
import { IssuedCertificateRecord } from '../types';

type TabPanelProps = {
  children?: React.ReactNode;
  index: number;
  value: number;
};

const TabPanel = ({ children, index, value }: TabPanelProps) => (
  <Box role='tabpanel' hidden={value !== index} sx={{ py: 2 }}>
    {value === index && children}
  </Box>
);

export const CertificatesPage = () => {
  const { address, chainId, isConnecting, error, provider, connect, disconnect } = useWallet();
  const [tab, setTab] = React.useState(0);
  const [issuedCertificates, setIssuedCertificates] = React.useState<IssuedCertificateRecord[]>([]);
  const [verifyPrefillId, setVerifyPrefillId] = React.useState<string | null>(null);

  const jumpToVerify = (certificateId: string) => {
    setVerifyPrefillId(certificateId);
    setTab(3);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position='static' color='inherit' elevation={1}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WorkspacePremiumOutlined color='primary' fontSize='large' />
            <Typography variant='h6' sx={{ ml: 2, color: blue[800] }}>
              Certificate Verification
            </Typography>
          </Box>
          <WalletConnectButton
            address={address}
            isConnecting={isConnecting}
            error={error}
            connect={connect}
            disconnect={disconnect}
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth='lg' sx={{ py: 4 }}>
        {chainId && chainId !== '0xaa36a7' && (
          <Typography variant='caption' color='warning.main' sx={{ display: 'block', mb: 2 }}>
            Connected wallet is not on Sepolia testnet. Switch networks in your wallet to interact with the
            contract.
          </Typography>
        )}
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, md: 8 }}>
            <Box component={Paper} sx={{ p: 2 }}>
              <Tabs value={tab} onChange={(_e, value) => setTab(value)}>
                <Tab label='Deployment' />
                <Tab label='About' />
                <Tab label='Issue Certificate' />
                <Tab label='Verify Certificate' />
                <Tab label='Manage Access' />
              </Tabs>
              <TabPanel value={tab} index={0}>
                <DeploymentOverview />
              </TabPanel>
              <TabPanel value={tab} index={1}>
                <AboutOverview />
              </TabPanel>
              <TabPanel value={tab} index={2}>
                <IssueCertificateForm
                  provider={provider}
                  issuerAddress={address}
                  onIssued={(record) => setIssuedCertificates((prev) => [...prev, record])}
                />
              </TabPanel>
              <TabPanel value={tab} index={3}>
                <CertificateVerifier prefillCertificateId={verifyPrefillId} />
              </TabPanel>
              <TabPanel value={tab} index={4}>
                <ManageAccess provider={provider} walletAddress={address} />
              </TabPanel>
            </Box>
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <RecentCertificatesAside certificates={issuedCertificates} onVerify={jumpToVerify} />
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  );
};
