import { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tooltip,
  Typography
} from '@mui/material';
import { ContentCopyOutlined, DoneOutlined, FactCheckOutlined } from '@mui/icons-material';
import { CERTIFICATE_TYPES } from '../utils/contract';
import { IssuedCertificateRecord } from '../types';

type RecentCertificatesAsideProps = {
  certificates: IssuedCertificateRecord[];
  onVerify: (certificateId: string) => void;
};

/** Client-side memory of certificates issued this session — nothing here is
 * fetched from chain. Exists so a ceritificate ID can be copied, or jumped
 * straight to the Verify tab, without retyping it. */
export const RecentCertificatesAside = ({ certificates, onVerify }: RecentCertificatesAsideProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  };

  return (
    <Box component={Paper} sx={{ p: 2, position: { md: 'sticky' }, top: { md: 16 } }}>
      <Typography variant='subtitle2' sx={{ mb: 1 }}>
        Issued This Session
      </Typography>
      {certificates.length === 0 ? (
        <Typography variant='caption' color='text.secondary'>
          Certificates you issue will show up here — click one to verify it.
        </Typography>
      ) : (
        <List dense disablePadding>
          {certificates
            .slice()
            .reverse()
            .map((cert) => (
              <ListItem
                key={`${cert.id}-${cert.issuedAt}`}
                disablePadding
                sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}
                secondaryAction={
                  <>
                    <Tooltip title={copiedId === cert.id ? 'Copied' : 'Copy ID'}>
                      <IconButton size='small' onClick={() => handleCopy(cert.id)}>
                        {copiedId === cert.id ? (
                          <DoneOutlined fontSize='small' color='success' />
                        ) : (
                          <ContentCopyOutlined fontSize='small' />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Verify'>
                      <IconButton size='small' onClick={() => onVerify(cert.id)}>
                        <FactCheckOutlined fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </>
                }
              >
                <ListItemText
                  primary={
                    <Typography variant='body2' component='span' sx={{ fontWeight: 600 }}>
                      #{cert.id} — {cert.studentName}
                    </Typography>
                  }
                  secondary={
                    <Chip
                      label={CERTIFICATE_TYPES[cert.certType] ?? 'Unknown'}
                      size='small'
                      variant='outlined'
                      sx={{ mt: 0.5 }}
                    />
                  }
                />
              </ListItem>
            ))}
        </List>
      )}
    </Box>
  );
};
