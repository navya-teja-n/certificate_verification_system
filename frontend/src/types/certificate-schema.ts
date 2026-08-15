import { z } from 'zod';

const walletAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Enter a valid wallet address');

export const issueCertificateSchema = z.object({
  studentWalletAddress: walletAddress,
  studentIdentifier: z.string().min(1, 'Student identifier is required'),
  studentName: z.string().min(1, 'Student name is required'),
  achievement: z.string().min(1, 'Achievement is required'),
  certType: z.coerce.number().int().min(0).max(5),
  description: z.string().optional()
});

export type IssueCertificateFormValues = z.infer<typeof issueCertificateSchema>;

export const verifyCertificateSchema = z.object({
  certificateId: z
    .string()
    .min(1, 'Certificate ID is required')
    .regex(/^\d+$/, 'Certificate ID must be a number')
});

export type VerifyCertificateFormValues = z.infer<typeof verifyCertificateSchema>;

export const registerSchoolSchema = z.object({
  schoolAdminAddress: walletAddress,
  schoolName: z.string().min(1, 'School name is required')
});

export type RegisterSchoolFormValues = z.infer<typeof registerSchoolSchema>;

export const manageIssuerSchema = z.object({
  schoolId: z.coerce.number().int().min(0, 'School ID is required'),
  issuerAddress: walletAddress
});

export type ManageIssuerFormValues = z.infer<typeof manageIssuerSchema>;
