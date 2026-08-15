// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CertificateRegistry} from "../src/CertificateRegistry.sol";

/// @notice Deploys CertificateRegistry. Run with:
/// forge script script/DeployCertificateRegistry.s.sol:DeployCertificateRegistry \
///   --rpc-url polygon_amoy --broadcast --verify
contract DeployCertificateRegistry is Script {
    function run() external returns (CertificateRegistry registry) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        registry = new CertificateRegistry();
        vm.stopBroadcast();

        console.log("CertificateRegistry deployed to:", address(registry));
    }
}
