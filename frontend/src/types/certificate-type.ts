export type CertificateMetadata = {
  studentName: string;
  studentIdentifier: string;
  achievement: string;
  certificateType: string;
  issuedOn: string;
  institution: string;
  description?: string;
};

export type OnChainCertificate = {
  id: number;
  student: string;
  studentIdentifier: string;
  ipfsHash: string;
  metadataHash: string;
  issuer: string;
  schoolId: number;
  certType: number;
  issuedAt: number;
  revoked: boolean;
  exists: boolean;
};

export type School = {
  id: number;
  name: string;
  admin: string;
  active: boolean;
};

/** A certificate issued earlier in this session, kept client-side so it can be
 * jumped to on the Verify tab without retyping the ID. Not fetched from chain. */
export type IssuedCertificateRecord = {
  id: string;
  studentName: string;
  studentIdentifier: string;
  certType: number;
  issuedAt: number;
};
