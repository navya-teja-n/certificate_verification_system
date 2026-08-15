// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CertificateRegistry
/// @notice Issues and verifies student achievement certificates on-chain.
///
/// Role model:
/// - DEFAULT_ADMIN_ROLE (platform admin): onboards schools onto the registry.
/// - SCHOOL_ADMIN_ROLE (informational/queryable role, one per school): the
///   school's own admin, who manages that school's issuers. Authorization for
///   school-scoped actions is enforced via `School.admin`, not this role alone,
///   so one school admin can never manage another school's issuers.
/// - ISSUER_ROLE: staff authorized to issue certificates on behalf of the
///   school that granted them the role.
///
/// Certificate content lives on IPFS; only a pointer (CID) and an integrity
/// hash of that content are stored on-chain.
contract CertificateRegistry is AccessControl {
    bytes32 public constant SCHOOL_ADMIN_ROLE = keccak256("SCHOOL_ADMIN_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    enum CertificateType {
        AcademicExcellence,
        CourseCompletion,
        Diploma,
        MeritAward,
        SportsAchievement,
        Other
    }

    struct School {
        string name;
        address admin;
        bool active;
    }

    struct Certificate {
        address student;
        string studentIdentifier;
        string ipfsHash;
        bytes32 metadataHash;
        address issuer;
        uint256 schoolId;
        CertificateType certType;
        uint256 issuedAt;
        bool revoked;
    }

    uint256 public nextSchoolId;
    uint256 public nextCertificateId;

    mapping(uint256 => School) public schools;
    /// @dev issuer address => schoolId it was granted ISSUER_ROLE by. Zero value
    /// combined with schools[0] existing is disambiguated by checking hasRole first.
    mapping(address => uint256) public issuerSchool;
    mapping(uint256 => Certificate) public certificates;
    mapping(address => uint256[]) public studentCertificates;

    event SchoolRegistered(uint256 indexed schoolId, string name, address indexed schoolAdmin);
    event SchoolStatusUpdated(uint256 indexed schoolId, bool active);
    event IssuerGranted(uint256 indexed schoolId, address indexed issuer);
    event IssuerRevoked(uint256 indexed schoolId, address indexed issuer);
    event CertificateIssued(
        uint256 indexed certificateId,
        address indexed student,
        uint256 indexed schoolId,
        CertificateType certType,
        string ipfsHash,
        address issuer
    );
    event CertificateRevoked(uint256 indexed certificateId, address indexed revokedBy);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlySchoolAdmin(uint256 schoolId) {
        _checkSchoolAdmin(schoolId);
        _;
    }

    function _checkSchoolAdmin(uint256 schoolId) internal view {
        require(_schoolExists(schoolId), "CertificateRegistry: school does not exist");
        require(schools[schoolId].admin == msg.sender, "CertificateRegistry: caller is not this school's admin");
    }

    // ---------- Platform admin: school onboarding ----------

    /// @notice Onboards a new school and assigns its admin. Platform-admin only.
    function registerSchool(address schoolAdmin, string calldata name)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (uint256 schoolId)
    {
        require(schoolAdmin != address(0), "CertificateRegistry: invalid school admin");
        require(bytes(name).length > 0, "CertificateRegistry: school name required");

        schoolId = nextSchoolId++;
        schools[schoolId] = School({name: name, admin: schoolAdmin, active: true});
        _grantRole(SCHOOL_ADMIN_ROLE, schoolAdmin);

        emit SchoolRegistered(schoolId, name, schoolAdmin);
    }

    /// @notice Suspends or reinstates a school. Suspended schools' issuers cannot issue. Platform-admin only.
    function setSchoolActive(uint256 schoolId, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_schoolExists(schoolId), "CertificateRegistry: school does not exist");
        schools[schoolId].active = active;
        emit SchoolStatusUpdated(schoolId, active);
    }

    // ---------- School admin: issuer management, scoped to their own school ----------

    /// @notice Authorizes an address to issue certificates on behalf of this school.
    function addIssuer(uint256 schoolId, address issuer) external onlySchoolAdmin(schoolId) {
        require(schools[schoolId].active, "CertificateRegistry: school is not active");
        require(issuer != address(0), "CertificateRegistry: invalid issuer address");

        issuerSchool[issuer] = schoolId;
        _grantRole(ISSUER_ROLE, issuer);

        emit IssuerGranted(schoolId, issuer);
    }

    /// @notice Revokes an issuer's authorization to issue on behalf of this school.
    function removeIssuer(uint256 schoolId, address issuer) external onlySchoolAdmin(schoolId) {
        require(
            hasRole(ISSUER_ROLE, issuer) && issuerSchool[issuer] == schoolId,
            "CertificateRegistry: issuer not part of this school"
        );

        delete issuerSchool[issuer];
        _revokeRole(ISSUER_ROLE, issuer);

        emit IssuerRevoked(schoolId, issuer);
    }

    // ---------- Issuer: certificate issuance ----------

    /// @notice Issues a new certificate to a student's wallet, on behalf of the caller's school.
    /// @param student Wallet address the certificate is issued to.
    /// @param studentIdentifier The school's internal student ID (off-chain reference).
    /// @param ipfsHash CID of the certificate metadata JSON pinned on IPFS.
    /// @param metadataHash keccak256 hash of the metadata JSON, for tamper detection.
    /// @param certType Category of achievement this certificate represents.
    function issueCertificate(
        address student,
        string calldata studentIdentifier,
        string calldata ipfsHash,
        bytes32 metadataHash,
        CertificateType certType
    ) external onlyRole(ISSUER_ROLE) returns (uint256 certificateId) {
        uint256 schoolId = issuerSchool[msg.sender];
        require(schools[schoolId].active, "CertificateRegistry: issuer's school is not active");
        require(student != address(0), "CertificateRegistry: invalid student address");
        require(bytes(ipfsHash).length > 0, "CertificateRegistry: empty ipfs hash");

        certificateId = nextCertificateId++;
        certificates[certificateId] = Certificate({
            student: student,
            studentIdentifier: studentIdentifier,
            ipfsHash: ipfsHash,
            metadataHash: metadataHash,
            issuer: msg.sender,
            schoolId: schoolId,
            certType: certType,
            issuedAt: block.timestamp,
            revoked: false
        });
        studentCertificates[student].push(certificateId);

        emit CertificateIssued(certificateId, student, schoolId, certType, ipfsHash, msg.sender);
    }

    /// @notice Revokes a certificate. Callable by the issuer who issued it, that
    /// school's admin, or the platform admin.
    function revokeCertificate(uint256 certificateId) external {
        require(certificateId < nextCertificateId, "CertificateRegistry: certificate does not exist");
        Certificate storage cert = certificates[certificateId];
        require(!cert.revoked, "CertificateRegistry: already revoked");
        require(
            msg.sender == cert.issuer || msg.sender == schools[cert.schoolId].admin
                || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "CertificateRegistry: not authorized to revoke"
        );

        cert.revoked = true;
        emit CertificateRevoked(certificateId, msg.sender);
    }

    // ---------- Public views ----------

    /// @notice Reads back a certificate's on-chain record for verification.
    /// `exists` is false (with all other fields zeroed) when the ID was never issued.
    function verifyCertificate(uint256 certificateId)
        external
        view
        returns (
            address student,
            string memory studentIdentifier,
            string memory ipfsHash,
            bytes32 metadataHash,
            address issuer,
            uint256 schoolId,
            CertificateType certType,
            uint256 issuedAt,
            bool revoked,
            bool exists
        )
    {
        if (certificateId >= nextCertificateId) {
            return (address(0), "", "", bytes32(0), address(0), 0, CertificateType.Other, 0, false, false);
        }
        Certificate memory cert = certificates[certificateId];
        return (
            cert.student,
            cert.studentIdentifier,
            cert.ipfsHash,
            cert.metadataHash,
            cert.issuer,
            cert.schoolId,
            cert.certType,
            cert.issuedAt,
            cert.revoked,
            true
        );
    }

    /// @notice Returns every certificate ID issued to a given student wallet.
    function getStudentCertificates(address student) external view returns (uint256[] memory) {
        return studentCertificates[student];
    }

    /// @notice True if `issuer` currently holds ISSUER_ROLE for a school that is active.
    function isIssuerActive(address issuer) external view returns (bool) {
        return hasRole(ISSUER_ROLE, issuer) && schools[issuerSchool[issuer]].active;
    }

    function _schoolExists(uint256 schoolId) internal view returns (bool) {
        return bytes(schools[schoolId].name).length > 0;
    }
}
