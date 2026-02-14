// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

interface IWaterfallDistributor {
    struct TrancheState {
        uint256 targetApr; // basis points
        uint256 totalShares; // total shares outstanding
        uint256 allocationPct; // percentage of pool
    }

    struct DistributionResult {
        uint256[3] trancheAmounts;
        uint256 totalDistributed;
    }

    struct LossResult {
        uint256[3] trancheLosses;
        uint256 totalLoss;
    }
}
