import { CertificateMetadata } from '../types';

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;
const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const IPFS_GATEWAY_URL = import.meta.env.VITE_IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';

/** Pins certificate metadata as JSON to IPFS via Pinata and returns its CID. */
export async function uploadCertificateMetadata(metadata: CertificateMetadata): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('IPFS is not configured. Set VITE_PINATA_JWT to a Pinata API JWT.');
  }

  const response = await fetch(PINATA_PIN_JSON_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `certificate-${metadata.studentIdentifier}-${Date.now()}` }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upload certificate metadata to IPFS: ${text}`);
  }

  const data = (await response.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

/** Fetches certificate metadata JSON back from an IPFS gateway by CID. */
export async function fetchCertificateMetadata(ipfsHash: string): Promise<CertificateMetadata> {
  const response = await fetch(`${IPFS_GATEWAY_URL}/${ipfsHash}`);
  if (!response.ok) {
    throw new Error('Failed to fetch certificate metadata from IPFS.');
  }
  return response.json();
}
