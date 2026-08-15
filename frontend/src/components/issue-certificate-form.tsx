import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid2,
  MenuItem,
  TextField,
  Typography
} from '@mui/material';
import { BrowserProvider, keccak256, toUtf8Bytes } from 'ethers';
import { CERTIFICATE_TYPES, getCertificateContract } from '../utils/contract';
import { uploadCertificateMetadata } from '../utils/ipfs';
import { issueCertificateSchema, IssueCertificateFormValues, IssuedCertificateRecord } from '../types';

type IssueCertificateFormProps = {
  provider: BrowserProvider | null;
  issuerAddress: string | null;
  onIssued?: (record: IssuedCertificateRecord) => void;
};

export const IssueCertificateForm = ({ provider, issuerAddress, onIssued }: IssueCertificateFormProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<IssueCertificateFormValues>({
    resolver: zodResolver(issueCertificateSchema),
    defaultValues: {
      studentIdentifier: '',
      studentName: '',
      studentWalletAddress: '',
      achievement: '',
      certType: 0,
      description: ''
    }
  });

  const onSubmit = async (values: IssueCertificateFormValues) => {
    if (!provider || !issuerAddress) {
      setStatus({ type: 'error', message: 'Connect your wallet before issuing a certificate.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const metadata = {
        studentName: values.studentName,
        studentIdentifier: values.studentIdentifier,
        achievement: values.achievement,
        certificateType: CERTIFICATE_TYPES[values.certType],
        description: values.description,
        issuedOn: new Date().toISOString(),
        institution: 'Certificate Verification System'
      };

      const ipfsHash = await uploadCertificateMetadata(metadata);
      const metadataHash = keccak256(toUtf8Bytes(JSON.stringify(metadata)));

      const signer = await provider.getSigner();
      const contract = getCertificateContract(signer);

      const tx = await contract.issueCertificate(
        values.studentWalletAddress,
        values.studentIdentifier,
        ipfsHash,
        metadataHash,
        values.certType
      );
      const receipt = await tx.wait();

      let certificateId = 'unknown';
      for (const log of receipt?.logs ?? []) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === 'CertificateIssued') {
            certificateId = parsed.args.certificateId.toString();
            break;
          }
        } catch {
          // log wasn't emitted by this contract's ABI, skip it
        }
      }

      setStatus({ type: 'success', message: `Certificate #${certificateId} issued on-chain.` });
      onIssued?.({
        id: certificateId,
        studentName: values.studentName,
        studentIdentifier: values.studentIdentifier,
        certType: values.certType,
        issuedAt: Date.now()
      });
      reset({
        studentIdentifier: '',
        studentName: '',
        studentWalletAddress: '',
        achievement: '',
        certType: 0,
        description: ''
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to issue certificate.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component='form' onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      <Typography variant='subtitle1' sx={{ mb: 2 }}>
        Issue Certificate
      </Typography>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            size='small'
            label='Student Name'
            {...register('studentName')}
            error={!!errors.studentName}
            helperText={errors.studentName?.message}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            size='small'
            label='Student Identifier'
            {...register('studentIdentifier')}
            error={!!errors.studentIdentifier}
            helperText={errors.studentIdentifier?.message}
          />
        </Grid2>
        <Grid2 size={12}>
          <TextField
            fullWidth
            size='small'
            label='Student Wallet Address'
            placeholder='0x...'
            {...register('studentWalletAddress')}
            error={!!errors.studentWalletAddress}
            helperText={errors.studentWalletAddress?.message}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            size='small'
            label='Achievement'
            {...register('achievement')}
            error={!!errors.achievement}
            helperText={errors.achievement?.message}
          />
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6 }}>
          <Controller
            name='certType'
            control={control}
            render={({ field }) => (
              <TextField {...field} select fullWidth size='small' label='Certificate Type'>
                {CERTIFICATE_TYPES.map((label, index) => (
                  <MenuItem key={label} value={index}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid2>
        <Grid2 size={12}>
          <TextField
            fullWidth
            size='small'
            label='Description (optional)'
            multiline
            minRows={2}
            {...register('description')}
          />
        </Grid2>
      </Grid2>

      {status && (
        <Alert severity={status.type} sx={{ mt: 2 }}>
          {status.message}
        </Alert>
      )}

      <Button
        type='submit'
        variant='contained'
        sx={{ mt: 2 }}
        disabled={submitting || !provider || !issuerAddress}
        startIcon={submitting ? <CircularProgress size={16} /> : undefined}
      >
        {submitting ? 'Issuing...' : 'Issue Certificate On-Chain'}
      </Button>
    </Box>
  );
};
