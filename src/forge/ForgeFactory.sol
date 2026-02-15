// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ForgeVault} from "./ForgeVault.sol";
import {IForgeVault} from "../interfaces/IForgeVault.sol";

/// @title ForgeFactory
/// @notice Creates and registers ForgeVault instances.
/// @dev Tracks all vaults for discovery and aggregate metrics.
contract ForgeFactory {
    // --- State ---
    uint256 public vaultCount;
    mapping(uint256 id => address vault) public vaults;
    mapping(address originator => uint256[] vaultIds) public vaultsByOriginator;

    // --- Events ---
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed vault,
        address indexed originator,
        address underlyingAsset
    );

    // --- Structs ---
    struct CreateVaultParams {
        address underlyingAsset;
        address[3] trancheTokenAddresses;
        IForgeVault.TrancheParams[3] trancheParams;
        uint256 distributionInterval;
    }

    /// @notice Create a new ForgeVault
    /// @param params Vault creation parameters
    /// @return vaultAddress The deployed vault address
    function createVault(CreateVaultParams calldata params) external returns (address vaultAddress) {
        // Validate tranche tokens are deployed contracts
        for (uint256 i = 0; i < 3; i++) {
            require(params.trancheTokenAddresses[i] != address(0), "ForgeFactory: zero token");
            require(params.trancheTokenAddresses[i].code.length > 0, "ForgeFactory: token not deployed");
        }
        require(params.underlyingAsset != address(0), "ForgeFactory: zero underlying");
        require(params.underlyingAsset.code.length > 0, "ForgeFactory: underlying not deployed");

        uint256 vaultId = vaultCount++;

        ForgeVault vault = new ForgeVault(
            msg.sender,
            params.underlyingAsset,
            params.trancheTokenAddresses,
            params.trancheParams,
            params.distributionInterval
        );

        vaultAddress = address(vault);
        vaults[vaultId] = vaultAddress;
        vaultsByOriginator[msg.sender].push(vaultId);

        emit VaultCreated(vaultId, vaultAddress, msg.sender, params.underlyingAsset);
    }

    /// @notice Get all vault IDs for an originator
    function getOriginatorVaults(address originator_) external view returns (uint256[] memory) {
        return vaultsByOriginator[originator_];
    }

    /// @notice Get vault address by ID
    function getVault(uint256 vaultId) external view returns (address) {
        return vaults[vaultId];
    }
}
