// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CertificateRegistry} from "../src/CertificateRegistry.sol";

contract CertificateRegistryTest is Test {
    CertificateRegistry registry;

    address platformAdmin = address(this);
    address schoolAAdmin = address(0xA1);
    address schoolBAdmin = address(0xB1);
    address issuerA = address(0xA2);
    address issuerB = address(0xB2);
    address student = address(0xBEEF);
    address stranger = address(0xCAFE);

    uint256 schoolAId;
    uint256 schoolBId;

    function setUp() public {
        registry = new CertificateRegistry();
        schoolAId = registry.registerSchool(schoolAAdmin, "School A");
        schoolBId = registry.registerSchool(schoolBAdmin, "School B");

        vm.prank(schoolAAdmin);
        registry.addIssuer(schoolAId, issuerA);

        vm.prank(schoolBAdmin);
        registry.addIssuer(schoolBId, issuerB);
    }

    // ---------- School onboarding ----------

    function test_RegisterSchool() public view {
        (string memory name, address admin, bool active) = registry.schools(schoolAId);
        assertEq(name, "School A");
        assertEq(admin, schoolAAdmin);
        assertTrue(active);
    }

    function test_RevertWhen_NonPlatformAdminRegistersSchool() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.registerSchool(stranger, "Rogue School");
    }

    function test_SuspendedSchoolBlocksIssuance() public {
        registry.setSchoolActive(schoolAId, false);

        vm.prank(issuerA);
        vm.expectRevert("CertificateRegistry: issuer's school is not active");
        registry.issueCertificate(
            student, "STU-001", "QmHash", keccak256("meta"), CertificateRegistry.CertificateType.Diploma
        );
    }

    // ---------- Issuer management is scoped per-school ----------

    function test_RevertWhen_SchoolAdminManagesAnotherSchoolsIssuers() public {
        vm.prank(schoolAAdmin);
        vm.expectRevert("CertificateRegistry: caller is not this school's admin");
        registry.addIssuer(schoolBId, stranger);
    }

    function test_RemoveIssuer() public {
        vm.prank(schoolAAdmin);
        registry.removeIssuer(schoolAId, issuerA);

        vm.prank(issuerA);
        vm.expectRevert();
        registry.issueCertificate(
            student, "STU-002", "QmHash", keccak256("meta"), CertificateRegistry.CertificateType.Diploma
        );
    }

    // ---------- Certificate issuance ----------

    function test_IssueCertificateWithType() public {
        vm.prank(issuerA);
        uint256 id = registry.issueCertificate(
            student,
            "STU-003",
            "QmTestHash",
            keccak256("metadata"),
            CertificateRegistry.CertificateType.SportsAchievement
        );

        (
            address certStudent,
            string memory studentIdentifier,
            string memory ipfsHash,
            bytes32 metadataHash,
            address issuer,
            uint256 schoolId,
            CertificateRegistry.CertificateType certType,,
            bool revoked,
            bool exists
        ) = registry.verifyCertificate(id);

        assertEq(certStudent, student);
        assertEq(studentIdentifier, "STU-003");
        assertEq(ipfsHash, "QmTestHash");
        assertEq(metadataHash, keccak256("metadata"));
        assertEq(issuer, issuerA);
        assertEq(schoolId, schoolAId);
        assertEq(uint256(certType), uint256(CertificateRegistry.CertificateType.SportsAchievement));
        assertFalse(revoked);
        assertTrue(exists);
    }

    function test_RevertWhen_NonIssuerIssues() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.issueCertificate(
            student, "STU-004", "QmHash", keccak256("meta"), CertificateRegistry.CertificateType.Diploma
        );
    }

    function test_IssuersFromDifferentSchoolsAreIsolated() public {
        vm.prank(issuerA);
        uint256 idA = registry.issueCertificate(
            student, "STU-005", "QmHashA", keccak256("a"), CertificateRegistry.CertificateType.MeritAward
        );

        vm.prank(issuerB);
        uint256 idB = registry.issueCertificate(
            student, "STU-006", "QmHashB", keccak256("b"), CertificateRegistry.CertificateType.MeritAward
        );

        (,,,,, uint256 schoolIdForA,,,,) = registry.verifyCertificate(idA);
        (,,,,, uint256 schoolIdForB,,,,) = registry.verifyCertificate(idB);

        assertEq(schoolIdForA, schoolAId);
        assertEq(schoolIdForB, schoolBId);
    }

    // ---------- Revocation ----------

    function test_IssuerCanRevokeOwnCertificate() public {
        vm.prank(issuerA);
        uint256 id = registry.issueCertificate(
            student, "STU-007", "QmHash", keccak256("meta"), CertificateRegistry.CertificateType.Diploma
        );

        vm.prank(issuerA);
        registry.revokeCertificate(id);

        (,,,,,,,, bool revoked,) = registry.verifyCertificate(id);
        assertTrue(revoked);
    }

    function test_SchoolAdminCanRevokeItsIssuersCertificate() public {
        vm.prank(issuerA);
        uint256 id = registry.issueCertificate(
            student, "STU-008", "QmHash", keccak256("meta"), CertificateRegistry.CertificateType.Diploma
        );

        vm.prank(schoolAAdmin);
        registry.revokeCertificate(id);

        (,,,,,,,, bool revoked,) = registry.verifyCertificate(id);
        assertTrue(revoked);
    }

    function test_RevertWhen_UnrelatedIssuerRevokes() public {
        vm.prank(issuerA);
        uint256 id = registry.issueCertificate(
            student, "STU-009", "QmHash", keccak256("meta"), CertificateRegistry.CertificateType.Diploma
        );

        vm.prank(issuerB);
        vm.expectRevert("CertificateRegistry: not authorized to revoke");
        registry.revokeCertificate(id);
    }

    // ---------- Read-only lookups ----------

    function test_VerifyNonexistentCertificate() public view {
        (,,,,,,,,, bool exists) = registry.verifyCertificate(999);
        assertFalse(exists);
    }

    function test_GetStudentCertificates() public {
        vm.prank(issuerA);
        uint256 id1 = registry.issueCertificate(
            student, "STU-010", "QmHashA", keccak256("a"), CertificateRegistry.CertificateType.CourseCompletion
        );
        vm.prank(issuerA);
        uint256 id2 = registry.issueCertificate(
            student, "STU-010", "QmHashB", keccak256("b"), CertificateRegistry.CertificateType.CourseCompletion
        );

        uint256[] memory ids = registry.getStudentCertificates(student);
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }

    function test_IsIssuerActiveReflectsSchoolStatus() public {
        assertTrue(registry.isIssuerActive(issuerA));

        registry.setSchoolActive(schoolAId, false);
        assertFalse(registry.isIssuerActive(issuerA));
    }
}
