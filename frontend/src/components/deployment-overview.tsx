import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { OpenInNewOutlined } from '@mui/icons-material';
import {
  CERTIFICATE_CONTRACT_ADDRESS,
  CERTIFICATE_TYPES,
  getCertificateContract,
  getReadOnlyProvider
} from '../utils/contract';
import { OnChainCertificate, School } from '../types';

const EXPLORER_BASE = 'https://sepolia.etherscan.io';
const shorten = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

/** Everything here is read directly from the chain — schools and certificates
 * aren't hardcoded from any particular deployment run, so this stays accurate
 * as more get added. */
export const DeploymentOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [certificates, setCertificates] = useState<OnChainCertificate[]>([]);

  useEffect(() => {
    if (!CERTIFICATE_CONTRACT_ADDRESS) {
      setError('Certificate contract address is not configured (VITE_CERTIFICATE_CONTRACT_ADDRESS).');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const contract = getCertificateContract(getReadOnlyProvider());

        const [schoolCount, certificateCount]: [bigint, bigint] = await Promise.all([
          contract.nextSchoolId(),
          contract.nextCertificateId()
        ]);

        const schoolResults = await Promise.all(
          Array.from({ length: Number(schoolCount) }, (_, id) => contract.schools(id))
        );
        const certResults = await Promise.all(
          Array.from({ length: Number(certificateCount) }, (_, id) => contract.verifyCertificate(id))
        );

        if (cancelled) return;

        setSchools(
          schoolResults.map(([name, admin, active], id) => ({ id, name, admin, active }))
        );
        setCertificates(
          certResults.map(
            ([student, studentIdentifier, ipfsHash, metadataHash, issuer, schoolId, certType, issuedAt, revoked, exists], id) => ({
              id,
              student,
              studentIdentifier,
              ipfsHash,
              metadataHash,
              issuer,
              schoolId: Number(schoolId),
              certType: Number(certType),
              issuedAt: Number(issuedAt),
              revoked,
              exists
            })
          )
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load deployment data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant='subtitle1' sx={{ mb: 1 }}>
        Deployment
      </Typography>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant='body2'>
          Network: <strong>Sepolia</strong> (chain 11155111)
        </Typography>
        <Typography variant='body2'>
          Contract:{' '}
          <Link
            href={`${EXPLORER_BASE}/address/${CERTIFICATE_CONTRACT_ADDRESS}`}
            target='_blank'
            rel='noopener noreferrer'
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}
          >
            {CERTIFICATE_CONTRACT_ADDRESS}
            <OpenInNewOutlined sx={{ fontSize: 14 }} />
          </Link>
        </Typography>
      </Stack>

      {loading && (
        <Stack direction='row' spacing={1} alignItems='center'>
          <CircularProgress size={16} />
          <Typography variant='body2' color='text.secondary'>
            Reading live state from chain...
          </Typography>
        </Stack>
      )}

      {error && <Alert severity='error'>{error}</Alert>}

      {!loading && !error && (
        <>
          <Typography variant='subtitle2' sx={{ mt: 2, mb: 1 }}>
            Schools ({schools.length})
          </Typography>
          {schools.length === 0 ? (
            <Typography variant='caption' color='text.secondary'>
              No schools registered yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant='outlined' sx={{ mb: 3 }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>{school.id}</TableCell>
                      <TableCell>{school.name}</TableCell>
                      <TableCell>
                        <Link
                          href={`${EXPLORER_BASE}/address/${school.admin}`}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          {shorten(school.admin)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={school.active ? 'Active' : 'Suspended'}
                          size='small'
                          color={school.active ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant='subtitle2' sx={{ mb: 1 }}>
            Certificates ({certificates.length})
          </Typography>
          {certificates.length === 0 ? (
            <Typography variant='caption' color='text.secondary'>
              No certificates issued yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant='outlined'>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>School</TableCell>
                    <TableCell>Issuer</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>{cert.id}</TableCell>
                      <TableCell>{cert.studentIdentifier}</TableCell>
                      <TableCell>{CERTIFICATE_TYPES[cert.certType] ?? 'Unknown'}</TableCell>
                      <TableCell>{schools.find((s) => s.id === cert.schoolId)?.name ?? cert.schoolId}</TableCell>
                      <TableCell>
                        <Link
                          href={`${EXPLORER_BASE}/address/${cert.issuer}`}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          {shorten(cert.issuer)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={cert.revoked ? 'Revoked' : 'Valid'}
                          size='small'
                          color={cert.revoked ? 'error' : 'success'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
};
