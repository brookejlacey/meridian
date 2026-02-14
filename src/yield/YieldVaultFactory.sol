// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {YieldVault} from "./YieldVault.sol";

/// @title YieldVaultFactory
/// @notice Creates and tracks YieldVault instances.
/// @dev One YieldVault per (ForgeVault, trancheId) pair.
contract YieldVaultFactory {
    uint256 public vaultCount;
    mapping(uint256 => address) public vaults;
    mapping(address => mapping(uint8 => address)) public vaultByForgeAndTranche;

    event YieldVaultCreated(
        uint256 indexed vaultId,
        address indexed yieldVault,
        address indexed forgeVault,
        uint8 trancheId,
        string name,
        string symbol
    );

    /// @notice Create a new YieldVault wrapping a ForgeVault tranche
    function createYieldVault(
        address forgeVault,
        uint8 trancheId,
        string calldata name,
        string calldata symbol,
        uint256 compoundInterval
    ) external returns (address yieldVaultAddress) {
        require(forgeVault != address(0), "YieldVaultFactory: zero vault");
        require(trancheId < 3, "YieldVaultFactory: invalid tranche");
        require(
            vaultByForgeAndTranche[forgeVault][trancheId] == address(0),
            "YieldVaultFactory: already exists"
        );

        uint256 vaultId = vaultCount++;

        YieldVault yv = new YieldVault(forgeVault, trancheId, name, symbol, compoundInterval);
        yieldVaultAddress = address(yv);

        vaults[vaultId] = yieldVaultAddress;
        vaultByForgeAndTranche[forgeVault][trancheId] = yieldVaultAddress;

        emit YieldVaultCreated(vaultId, yieldVaultAddress, forgeVault, trancheId, name, symbol);
    }

    function getYieldVault(address forgeVault, uint8 trancheId) external view returns (address) {
        return vaultByForgeAndTranche[forgeVault][trancheId];
    }

    function getVault(uint256 vaultId) external view returns (address) {
        return vaults[vaultId];
    }
}
