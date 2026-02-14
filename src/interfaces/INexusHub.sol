// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

interface INexusHub {
    struct AccountInfo {
        uint256 totalCollateralValue;
        uint256 totalBorrowValue;
        bool isHealthy;
        uint256 lastAttestationTime;
    }

    event MarginAccountOpened(address indexed user);
    event CollateralDeposited(address indexed user, address indexed asset, uint256 amount);
    event LiquidationTriggered(address indexed user, address indexed liquidator);
    event AttestationReceived(bytes32 indexed chainId, address indexed user);

    function openMarginAccount() external;
    function depositCollateral(address asset, uint256 amount) external;
    function withdrawCollateral(address asset, uint256 amount) external;
    function getMarginRatio(address user) external view returns (uint256);
    function isHealthy(address user) external view returns (bool);
    function triggerLiquidation(address user) external;
    function getTotalCollateralValue(address user) external view returns (uint256);
    function getLocalCollateralValue(address user) external view returns (uint256);
    function getUserAssets(address user) external view returns (address[] memory);
}
