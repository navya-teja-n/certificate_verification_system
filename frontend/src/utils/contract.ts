import { BrowserProvider, Contract, JsonRpcProvider, JsonRpcSigner } from 'ethers';

export const CERTIFICATE_CONTRACT_ADDRESS = import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS as string;

export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'; // 11155111

export const SEPOLIA_NETWORK_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID_HEX,
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: [import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io']
};

// Certificate types, in the same order as the contract's `CertificateType` enum —
// the index sent on-chain and the label shown in the UI must stay in sync.
export const CERTIFICATE_TYPES = [
  'Academic Excellence',
  'Course Completion',
  'Diploma',
  'Merit Award',
  'Sports Achievement',
  'Other'
] as const;

export const CERTIFICATE_REGISTRY_ABI = [
  'function registerSchool(address schoolAdmin, string name) external returns (uint256)',
  'function setSchoolActive(uint256 schoolId, bool active) external',
  'function addIssuer(uint256 schoolId, address issuer) external',
  'function removeIssuer(uint256 schoolId, address issuer) external',
  'function issueCertificate(address student, string studentIdentifier, string ipfsHash, bytes32 metadataHash, uint8 certType) external returns (uint256)',
  'function revokeCertificate(uint256 certificateId) external',
  'function verifyCertificate(uint256 certificateId) external view returns (address student, string studentIdentifier, string ipfsHash, bytes32 metadataHash, address issuer, uint256 schoolId, uint8 certType, uint256 issuedAt, bool revoked, bool exists)',
  'function getStudentCertificates(address student) external view returns (uint256[])',
  'function schools(uint256 schoolId) external view returns (string name, address admin, bool active)',
  'function nextSchoolId() external view returns (uint256)',
  'function nextCertificateId() external view returns (uint256)',
  'function issuerSchool(address issuer) external view returns (uint256)',
  'function isIssuerActive(address issuer) external view returns (bool)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
  'event SchoolRegistered(uint256 indexed schoolId, string name, address indexed schoolAdmin)',
  'event IssuerGranted(uint256 indexed schoolId, address indexed issuer)',
  'event IssuerRevoked(uint256 indexed schoolId, address indexed issuer)',
  'event CertificateIssued(uint256 indexed certificateId, address indexed student, uint256 indexed schoolId, uint8 certType, string ipfsHash, address issuer)',
  'event CertificateRevoked(uint256 indexed certificateId, address indexed revokedBy)'
];

export function getBrowserProvider(): BrowserProvider {
  if (!window.ethereum) {
    throw new Error('No Ethereum wallet found. Please install MetaMask.');
  }
  return new BrowserProvider(window.ethereum);
}

export function getReadOnlyProvider(): JsonRpcProvider {
  return new JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org');
}

export function getCertificateContract(signerOrProvider: JsonRpcSigner | BrowserProvider | JsonRpcProvider) {
  if (!CERTIFICATE_CONTRACT_ADDRESS) {
    throw new Error('Certificate contract address is not configured (VITE_CERTIFICATE_CONTRACT_ADDRESS).');
  }
  return new Contract(CERTIFICATE_CONTRACT_ADDRESS, CERTIFICATE_REGISTRY_ABI, signerOrProvider);
}
