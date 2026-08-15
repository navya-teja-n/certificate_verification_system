import {
  Box,
  Chip,
  Divider,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography
} from '@mui/material';
import { CheckCircleOutline } from '@mui/icons-material';
import { CERTIFICATE_TYPES } from '../utils/contract';

const requirements = [
  {
    title: 'Smart contract for issuance and verification',
    detail:
      "CertificateRegistry.sol — issueCertificate, revokeCertificate, and a public view verifyCertificate. Deployed and tested live on Sepolia (see the Deployment tab)."
  },
  {
    title: 'Web3 wallet connection in the frontend',
    detail:
      'MetaMask via ethers.js (BrowserProvider). Prompts a network switch to Sepolia automatically if the connected wallet is on the wrong chain.'
  },
  {
    title: 'Certificate management in the admin panel',
    detail: "Issue Certificate and Manage Access tabs — issuing, revoking, school onboarding, and issuer authorization, all from the UI."
  },
  {
    title: 'IPFS for certificate metadata storage',
    detail:
      "Certificate metadata (student name, achievement, date, type) is pinned to IPFS via Pinata. Only the CID and a keccak256 integrity hash of that metadata are stored on-chain — the Verify tab re-fetches the IPFS content and checks it against the on-chain hash."
  }
];

const roleRows = [
  {
    role: 'Platform Admin',
    onChain: 'DEFAULT_ADMIN_ROLE',
    heldBy: 'Whoever deployed the contract',
    canDo: 'Register new schools (and their admin wallet). Suspend or reinstate any school.'
  },
  {
    role: 'School Admin',
    onChain: 'School.admin (per school)',
    heldBy: 'One wallet per school, set when the school is registered',
    canDo: "Authorize or revoke issuers — but only for their own school. Enforced by checking School.admin directly, not a flat role, so School A's admin gets a revert trying to touch School B's issuers."
  },
  {
    role: 'Issuer',
    onChain: 'ISSUER_ROLE',
    heldBy: 'Staff a school admin has authorized',
    canDo: 'Issue certificates on behalf of the school that authorized them. Revoke certificates they personally issued.'
  }
];

export const AboutOverview = () => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant='subtitle1' sx={{ mb: 1 }}>
        What This Is
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
        A certificate verification system for student achievements: schools issue certificates on-chain to a
        student's wallet, metadata lives on IPFS, and anyone can verify a certificate's authenticity by ID —
        no account or wallet required to check one.
      </Typography>

      <Typography variant='subtitle2' sx={{ mb: 1 }}>
        Requirements Implemented
      </Typography>
      <List dense disablePadding sx={{ mb: 3 }}>
        {requirements.map((req) => (
          <ListItem key={req.title} alignItems='flex-start' disableGutters>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
              <CheckCircleOutline color='success' fontSize='small' />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant='body2' sx={{ fontWeight: 600 }}>{req.title}</Typography>}
              secondary={req.detail}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ mb: 3 }} />

      <Typography variant='subtitle2' sx={{ mb: 1 }}>
        How Access Roles Work
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
        Three roles, because a single "admin can do everything" flag isn't enough once more than one school
        shares the same contract. Authority flows downward — platform admin onboards schools, each school's
        own admin manages its own issuers, issuers issue certificates — and each level is scoped so it can't
        reach outside its own lane.
      </Typography>
      <TableContainer component={Paper} variant='outlined' sx={{ mb: 3 }}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>On-chain</TableCell>
              <TableCell>Held by</TableCell>
              <TableCell>Can do</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roleRows.map((row) => (
              <TableRow key={row.role}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{row.role}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <code>{row.onChain}</code>
                </TableCell>
                <TableCell>{row.heldBy}</TableCell>
                <TableCell>{row.canDo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant='body2'>
          <strong>Suspending a school</strong> blocks its issuers from issuing new certificates immediately —
          without revoking their ISSUER_ROLE grant. Reinstating the school restores them with no re-authorization
          needed.
        </Typography>
        <Typography variant='body2'>
          <strong>Revoking a certificate</strong> is allowed for: the issuer who issued it, that certificate's
          school admin, or the platform admin. No one else — including an issuer at a different school.
        </Typography>
      </Stack>

      <Typography variant='subtitle2' sx={{ mb: 1 }}>
        Certificate Types
      </Typography>
      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mb: 3 }}>
        {CERTIFICATE_TYPES.map((label) => (
          <Chip key={label} label={label} size='small' variant='outlined' />
        ))}
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Typography variant='caption' color='text.secondary'>
        Every access-control path above has been tested twice: 14 automated tests (
        <code>forge test</code>) and a full run of real, separately-signed transactions on Sepolia — see the{' '}
        <strong>Deployment</strong> tab for the live contract and{' '}
        <Link href='https://sepolia.etherscan.io' target='_blank' rel='noopener noreferrer'>
          Etherscan
        </Link>
        .
      </Typography>
    </Box>
  );
};
