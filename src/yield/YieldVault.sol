// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IForgeVault} from "../interfaces/IForgeVault.sol";
import {MeridianMath} from "../libraries/MeridianMath.sol";

/// @title YieldVault
/// @notice ERC4626 auto-compounding wrapper for a ForgeVault tranche.
/// @dev Users deposit underlying (e.g. USDC). The vault invests into a specific
///      ForgeVault tranche and periodically compounds yield via `compound()`.
///      Share price appreciates as yield is harvested and reinvested.
///
///      Example: Alice deposits 100k USDC into the Senior YieldVault.
///      Keeper calls compound() weekly → claims yield → reinvests → share price rises.
///      Alice withdraws later with more USDC than she deposited.
contract YieldVault is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Virtual offset to prevent ERC4626 inflation attack (10^3 virtual shares)
    function _decimalsOffset() internal pure override returns (uint8) {
        return 3;
    }

    // --- Immutables ---
    IForgeVault public immutable FORGE_VAULT;
    uint8 public immutable TRANCHE_ID;

    // --- State ---
    uint256 public totalInvested;
    uint256 public totalHarvested;
    uint256 public lastCompoundTime;
    uint256 public compoundInterval;

    // --- Events ---
    event Compounded(uint256 yieldClaimed, uint256 reinvested, address caller);
    event EmergencyWithdrawExecuted(uint256 amountRecovered);

    constructor(
        address forgeVault_,
        uint8 trancheId_,
        string memory name_,
        string memory symbol_,
        uint256 compoundInterval_
    ) ERC20(name_, symbol_) ERC4626(IERC20(address(IForgeVault(forgeVault_).underlyingAsset()))) {
        require(forgeVault_ != address(0), "YieldVault: zero vault");
        require(trancheId_ < 3, "YieldVault: invalid tranche");

        FORGE_VAULT = IForgeVault(forgeVault_);
        TRANCHE_ID = trancheId_;
        compoundInterval = compoundInterval_;
        lastCompoundTime = block.timestamp;

        // Pre-approve ForgeVault to pull underlying from us
        IERC20(address(IForgeVault(forgeVault_).underlyingAsset())).approve(
            forgeVault_, type(uint256).max
        );
    }

    // --- ERC4626 Overrides ---

    /// @dev Total assets = invested principal + claimable yield + idle balance
    function totalAssets() public view override returns (uint256) {
        uint256 claimable = FORGE_VAULT.getClaimableYield(address(this), TRANCHE_ID);
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        return totalInvested + claimable + idle;
    }

    /// @dev Deposit: pull underlying from caller, invest into ForgeVault, mint shares
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        override
        nonReentrant
    {
        require(
            FORGE_VAULT.poolStatus() == IForgeVault.PoolStatus.Active,
            "YieldVault: vault not active"
        );

        // Pull underlying from caller
        SafeERC20.safeTransferFrom(IERC20(asset()), caller, address(this), assets);

        // Mint YieldVault shares to receiver
        _mint(receiver, shares);

        // Invest into ForgeVault
        FORGE_VAULT.investFor(TRANCHE_ID, assets, address(this));
        totalInvested += assets;

        emit Deposit(caller, receiver, assets, shares);
    }

    /// @dev Withdraw: pull from ForgeVault if needed, burn shares, transfer to receiver
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override nonReentrant {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        _burn(owner, shares);

        // Check idle balance — if insufficient, withdraw from ForgeVault
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle < assets) {
            uint256 needed = assets - idle;
            // Clamp to totalInvested to avoid underflow
            if (needed > totalInvested) needed = totalInvested;
            FORGE_VAULT.withdraw(TRANCHE_ID, needed);
            totalInvested -= needed;
        }

        SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    // --- Compounding ---

    /// @notice Harvest yield from ForgeVault and reinvest into the same tranche.
    /// @dev Callable by anyone (keepers). Rate-limited by compoundInterval.
    /// @return harvested Amount of yield claimed and reinvested
    function compound() external nonReentrant returns (uint256 harvested) {
        require(
            block.timestamp >= lastCompoundTime + compoundInterval,
            "YieldVault: too soon"
        );
        require(
            FORGE_VAULT.poolStatus() == IForgeVault.PoolStatus.Active,
            "YieldVault: vault not active"
        );

        // Claim yield
        harvested = FORGE_VAULT.claimYield(TRANCHE_ID);

        if (harvested > 0) {
            // Reinvest into same tranche
            FORGE_VAULT.investFor(TRANCHE_ID, harvested, address(this));
            totalHarvested += harvested;
            totalInvested += harvested;
        }

        lastCompoundTime = block.timestamp;
        emit Compounded(harvested, harvested, msg.sender);
    }

    /// @notice Emergency withdrawal when underlying ForgeVault is Defaulted.
    /// @dev Attempts to recover as much underlying as possible.
    function emergencyWithdraw() external nonReentrant returns (uint256 recovered) {
        require(
            FORGE_VAULT.poolStatus() == IForgeVault.PoolStatus.Defaulted,
            "YieldVault: not defaulted"
        );

        uint256 toWithdraw = totalInvested;
        if (toWithdraw > 0) {
            // Clear totalInvested regardless — defaulted vault assets are unrecoverable
            totalInvested = 0;
            try FORGE_VAULT.withdraw(TRANCHE_ID, toWithdraw) {
                // Full recovery succeeded
            } catch {
                // Partial/no recovery — funds are unrecoverable from defaulted vault
            }
        }

        recovered = IERC20(asset()).balanceOf(address(this));
        emit EmergencyWithdrawExecuted(recovered);
    }

    // --- View ---

    function forgeVault() external view returns (address) {
        return address(FORGE_VAULT);
    }

    function trancheId() external view returns (uint8) {
        return TRANCHE_ID;
    }

    function getMetrics()
        external
        view
        returns (
            uint256 totalAssets_,
            uint256 totalInvested_,
            uint256 totalHarvested_,
            uint256 sharePrice,
            uint256 apy
        )
    {
        totalAssets_ = totalAssets();
        totalInvested_ = totalInvested;
        totalHarvested_ = totalHarvested;

        uint256 supply = totalSupply();
        sharePrice = supply == 0 ? 1e18 : MeridianMath.wadDiv(totalAssets_, supply);

        // Rough APY: (harvested / totalInvested) annualized
        uint256 elapsed = block.timestamp - lastCompoundTime;
        if (elapsed > 0 && totalInvested_ > 0 && totalHarvested_ > 0) {
            apy = (totalHarvested_ * 365 days * 10_000) / (totalInvested_ * elapsed);
        }
    }
}
