import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, Box, Button, Divider, Grid2, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { BrowserProvider } from 'ethers';
import { getCertificateContract } from '../utils/contract';
import {
  ManageIssuerFormValues,
  RegisterSchoolFormValues,
  manageIssuerSchema,
  registerSchoolSchema
} from '../types';

type ManageAccessProps = {
  provider: BrowserProvider | null;
  walletAddress: string | null;
};

/// Minimal admin surface for the two roles the contract defines above "issuer":
/// the platform admin onboards schools; each school's own admin then grants or
/// revokes ISSUER_ROLE for staff at that school. Both actions revert on-chain
/// if the connected wallet doesn't hold the required role — this UI doesn't
/// need to duplicate that check, it just surfaces the resulting error.
export const ManageAccess = ({ provider, walletAddress }: ManageAccessProps) => {
  const [schoolStatus, setSchoolStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [issuerStatus, setIssuerStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [issuerAction, setIssuerAction] = useState<'add' | 'remove'>('add');
  const [submittingSchool, setSubmittingSchool] = useState(false);
  const [submittingIssuer, setSubmittingIssuer] = useState(false);

  const schoolForm = useForm<RegisterSchoolFormValues>({
    resolver: zodResolver(registerSchoolSchema),
    defaultValues: { schoolAdminAddress: '', schoolName: '' }
  });

  const issuerForm = useForm<ManageIssuerFormValues>({
    resolver: zodResolver(manageIssuerSchema),
    defaultValues: { schoolId: 0, issuerAddress: '' }
  });

  const requireSigner = async () => {
    if (!provider || !walletAddress) {
      throw new Error('Connect your wallet first.');
    }
    return provider.getSigner();
  };

  const onRegisterSchool = async (values: RegisterSchoolFormValues) => {
    setSubmittingSchool(true);
    setSchoolStatus(null);
    try {
      const signer = await requireSigner();
      const contract = getCertificateContract(signer);
      const tx = await contract.registerSchool(values.schoolAdminAddress, values.schoolName);
      await tx.wait();
      setSchoolStatus({ type: 'success', message: `"${values.schoolName}" registered.` });
      schoolForm.reset();
    } catch (err) {
      setSchoolStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to register school.' });
    } finally {
      setSubmittingSchool(false);
    }
  };

  const onManageIssuer = async (values: ManageIssuerFormValues) => {
    setSubmittingIssuer(true);
    setIssuerStatus(null);
    try {
      const signer = await requireSigner();
      const contract = getCertificateContract(signer);
      const tx =
        issuerAction === 'add'
          ? await contract.addIssuer(values.schoolId, values.issuerAddress)
          : await contract.removeIssuer(values.schoolId, values.issuerAddress);
      await tx.wait();
      setIssuerStatus({
        type: 'success',
        message: issuerAction === 'add' ? 'Issuer authorized for that school.' : 'Issuer revoked from that school.'
      });
      issuerForm.reset({ schoolId: values.schoolId, issuerAddress: '' });
    } catch (err) {
      setIssuerStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update issuer.' });
    } finally {
      setSubmittingIssuer(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant='subtitle1'>Register School</Typography>
      <Typography variant='caption' color='text.secondary'>
        Platform admin only — onboards a school and assigns its admin wallet.
      </Typography>
      <Box component='form' onSubmit={schoolForm.handleSubmit(onRegisterSchool)} sx={{ mt: 1 }}>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size='small'
              label='School Name'
              {...schoolForm.register('schoolName')}
              error={!!schoolForm.formState.errors.schoolName}
              helperText={schoolForm.formState.errors.schoolName?.message}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size='small'
              label='School Admin Wallet'
              placeholder='0x...'
              {...schoolForm.register('schoolAdminAddress')}
              error={!!schoolForm.formState.errors.schoolAdminAddress}
              helperText={schoolForm.formState.errors.schoolAdminAddress?.message}
            />
          </Grid2>
        </Grid2>
        {schoolStatus && (
          <Alert severity={schoolStatus.type} sx={{ mt: 2 }}>
            {schoolStatus.message}
          </Alert>
        )}
        <Button type='submit' variant='contained' sx={{ mt: 2 }} disabled={submittingSchool || !provider}>
          {submittingSchool ? 'Registering...' : 'Register School'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant='subtitle1'>Manage Issuers</Typography>
      <Typography variant='caption' color='text.secondary'>
        School admin only — authorizes or revokes staff at your own school. Grants apply only to the school ID you
        enter; you can't manage another school's issuers.
      </Typography>
      <Box component='form' onSubmit={issuerForm.handleSubmit(onManageIssuer)} sx={{ mt: 1 }}>
        <Stack direction='row' spacing={2} sx={{ mb: 2 }}>
          <ToggleButtonGroup
            size='small'
            exclusive
            value={issuerAction}
            onChange={(_e, value) => value && setIssuerAction(value)}
          >
            <ToggleButton value='add'>Add Issuer</ToggleButton>
            <ToggleButton value='remove'>Remove Issuer</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Grid2 container spacing={2}>
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size='small'
              type='number'
              label='School ID'
              {...issuerForm.register('schoolId')}
              error={!!issuerForm.formState.errors.schoolId}
              helperText={issuerForm.formState.errors.schoolId?.message}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, sm: 8 }}>
            <TextField
              fullWidth
              size='small'
              label='Issuer Wallet'
              placeholder='0x...'
              {...issuerForm.register('issuerAddress')}
              error={!!issuerForm.formState.errors.issuerAddress}
              helperText={issuerForm.formState.errors.issuerAddress?.message}
            />
          </Grid2>
        </Grid2>
        {issuerStatus && (
          <Alert severity={issuerStatus.type} sx={{ mt: 2 }}>
            {issuerStatus.message}
          </Alert>
        )}
        <Button type='submit' variant='contained' sx={{ mt: 2 }} disabled={submittingIssuer || !provider}>
          {submittingIssuer
            ? 'Submitting...'
            : issuerAction === 'add'
              ? 'Authorize Issuer'
              : 'Revoke Issuer'}
        </Button>
      </Box>
    </Box>
  );
};
