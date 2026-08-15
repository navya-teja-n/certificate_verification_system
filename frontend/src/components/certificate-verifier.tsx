import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid2,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { CheckCircleOutline, HighlightOff } from '@mui/icons-material';
import { CERTIFICATE_TYPES, getCertificateContract, getReadOnlyProvider } from '../utils/contract';
import { fetchCertificateMetadata } from '../utils/ipfs';
import { OnChainCertificate, VerifyCertificateFormValues, verifyCertificateSchema } from '../types';
import { keccak256, toUtf8Bytes } from 'ethers';

type CertificateVerifierProps = {
  /** Set (e.g. from the recent-issuances aside) to fill the field and verify immediately. */
  prefillCertificateId?: string | null;
};

export const CertificateVerifier = ({ prefillCertificateId }: CertificateVerifierProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnChainCertificate | null>(null);
  const [metadataMatches, setMetadataMatches] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<VerifyCertificateFormValues>({
    resolver: zodResolver(verifyCertificateSchema),
    defaultValues: { certificateId: '' }
  });

  const verify = async ({ certificateId }: VerifyCertificateFormValues) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMetadataMatches(null);

    try {
      const contract = getCertificateContract(getReadOnlyProvider());
      const [student, studentIdentifier, ipfsHash, metadataHash, issuer, schoolId, certType, issuedAt, revoked, exists] =
        await contract.verifyCertificate(certificateId);

      if (!exists) {
        setError(`No certificate found with ID ${certificateId}.`);
        return;
      }

      setResult({
        id: Number(certificateId),
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
      });

      try {
        const metadata = await fetchCertificateMetadata(ipfsHash);
        const computedHash = keccak256(toUtf8Bytes(JSON.stringify(metadata)));
        setMetadataMatches(computedHash === metadataHash);
      } catch {
        setMetadataMatches(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify certificate.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!prefillCertificateId) return;
    setValue('certificateId', prefillCertificateId);
    verify({ certificateId: prefillCertificateId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillCertificateId]);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant='subtitle1' sx={{ mb: 2 }}>
        Verify Certificate
      </Typography>
      <Box component='form' onSubmit={handleSubmit(verify)}>
        <Stack direction='row' spacing={2} alignItems='flex-start'>
          <TextField
            size='small'
            label='Certificate ID'
            placeholder='0'
            {...register('certificateId')}
            error={!!errors.certificateId}
            helperText={errors.certificateId?.message}
          />
          <Button
            type='submit'
            variant='contained'
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card sx={{ mt: 2 }} variant='outlined'>
          <CardContent>
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
              {result.revoked ? (
                <Chip icon={<HighlightOff />} label='Revoked' color='error' size='small' />
              ) : (
                <Chip icon={<CheckCircleOutline />} label='Valid' color='success' size='small' />
              )}
              {metadataMatches === false && (
                <Chip label='Metadata hash mismatch' color='error' size='small' variant='outlined' />
              )}
              {metadataMatches === true && (
                <Chip label='Metadata integrity verified' color='success' size='small' variant='outlined' />
              )}
            </Stack>
            <Grid2 container spacing={1}>
              <Grid2 size={6}>
                <Typography variant='caption' color='text.secondary'>
                  Student Identifier
                </Typography>
                <Typography variant='body2'>{result.studentIdentifier}</Typography>
              </Grid2>
              <Grid2 size={6}>
                <Typography variant='caption' color='text.secondary'>
                  Student Wallet
                </Typography>
                <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
                  {result.student}
                </Typography>
              </Grid2>
              <Grid2 size={6}>
                <Typography variant='caption' color='text.secondary'>
                  Issuer
                </Typography>
                <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
                  {result.issuer}
                </Typography>
              </Grid2>
              <Grid2 size={6}>
                <Typography variant='caption' color='text.secondary'>
                  Certificate Type
                </Typography>
                <Typography variant='body2'>{CERTIFICATE_TYPES[result.certType] ?? 'Unknown'}</Typography>
              </Grid2>
              <Grid2 size={6}>
                <Typography variant='caption' color='text.secondary'>
                  School ID
                </Typography>
                <Typography variant='body2'>{result.schoolId}</Typography>
              </Grid2>
              <Grid2 size={6}>
                <Typography variant='caption' color='text.secondary'>
                  Issued At
                </Typography>
                <Typography variant='body2'>
                  {new Date(result.issuedAt * 1000).toLocaleString()}
                </Typography>
              </Grid2>
              <Grid2 size={12}>
                <Typography variant='caption' color='text.secondary'>
                  IPFS Metadata
                </Typography>
                <Typography variant='body2' sx={{ wordBreak: 'break-all' }}>
                  {result.ipfsHash}
                </Typography>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
