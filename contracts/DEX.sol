// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DEX is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public tokenA;
    address public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityMinted);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidityBurned);
    event Swap(address indexed trader, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid token");
        require(_tokenA != _tokenB, "Same token");

        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    // ---------------- LIQUIDITY ----------------

    function addLiquidity(uint256 amountA, uint256 amountB)
        external
        nonReentrant
        returns (uint256 liquidityMinted)
    {
        require(amountA > 0 && amountB > 0, "Zero amount");

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        if (totalLiquidity == 0) {
            liquidityMinted = _sqrt(amountA * amountB);
        } else {
            uint256 lA = (amountA * totalLiquidity) / reserveA;
            uint256 lB = (amountB * totalLiquidity) / reserveB;
            liquidityMinted = _min(lA, lB);
        }

        require(liquidityMinted > 0, "No liquidity");

        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;

        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    }

    function removeLiquidity(uint256 liquidityAmount)
        external
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        require(liquidityAmount > 0, "Zero liquidity");
        require(liquidity[msg.sender] >= liquidityAmount, "Not enough liquidity");

        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;

        reserveA -= amountA;
        reserveB -= amountB;

        IERC20(tokenA).safeTransfer(msg.sender, amountA);
        IERC20(tokenB).safeTransfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    }

    // ---------------- SWAPS ----------------

    function swapAForB(uint256 amountAIn)
        external
        nonReentrant
        returns (uint256 amountBOut)
    {
        require(amountAIn > 0, "Zero swap");

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountAIn);

        amountBOut = getAmountOut(amountAIn, reserveA, reserveB);

        reserveA += amountAIn;
        reserveB -= amountBOut;

        IERC20(tokenB).safeTransfer(msg.sender, amountBOut);

        emit Swap(msg.sender, tokenA, tokenB, amountAIn, amountBOut);
    }

    function swapBForA(uint256 amountBIn)
        external
        nonReentrant
        returns (uint256 amountAOut)
    {
        require(amountBIn > 0, "Zero swap");

        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountBIn);

        amountAOut = getAmountOut(amountBIn, reserveB, reserveA);

        reserveB += amountBIn;
        reserveA -= amountAOut;

        IERC20(tokenA).safeTransfer(msg.sender, amountAOut);

        emit Swap(msg.sender, tokenB, tokenA, amountBIn, amountAOut);
    }

    // ---------------- VIEWS ----------------

    function getPrice() external view returns (uint256 price) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256) {
        require(amountIn > 0, "Zero input");
        require(reserveIn > 0 && reserveOut > 0, "Empty pool");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }

    // ---------------- MATH ----------------

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
