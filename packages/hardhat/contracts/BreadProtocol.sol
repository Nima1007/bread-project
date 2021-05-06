// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./AaveUniswapBase.sol";

contract BreadProtocol is AaveUniswapBase { 

    constructor(address lendingPoolAddressesProviderAddress, address uniswapRouterAddress) AaveUniswapBase(lendingPoolAddressesProviderAddress, uniswapRouterAddress) public {}

    // Gets the amount available to borrow for a given address for a given asset
    function getAvailableBorrowInAsset(address borrowAsset, address bread) public view returns (uint256) {
    ( ,,uint256 availableBorrowsETH,,,) = LENDING_POOL().getUserAccountData(bread);
    return getAssetAmount(borrowAsset, availableBorrowsETH);
    }

    // Converts an amount denominated in ETH into an asset based on the Aave oracle
    function getAssetAmount(address asset, uint256 amountInEth) public view returns (uint256) {
        uint256 assetPrice = getPriceOracle().getAssetPrice(asset);
        (uint256 decimals ,,,,,,,,,) = getProtocolDataProvider().getReserveConfigurationData(asset);
        uint256 assetAmount = amountInEth.mul(10**decimals).div(assetPrice);
        return assetAmount;
    }

    function breadBorrow(address borrowAsset, uint256 interestRateMode) public returns (bool) {
        
        // Get the maximum amount available to borrow in the borrowAsset
        //
        // At some point, this could be removed and we could allow for greater control
        // over the borrowing value (e.g. not just a lump sum, credit lines, etc.)
        uint256 borrowAmount = getAvailableBorrowInAsset(borrowAsset, msg.sender);

        require(borrowAmount > 0, "Requires credit on Aave!");

        ILendingPool _lendingPool = LENDING_POOL();

        // Borrow from Aave
        _lendingPool.borrow(
            borrowAsset,
            borrowAmount,
            interestRateMode,
            0,
            msg.sender
        );
        return true;
    }
}