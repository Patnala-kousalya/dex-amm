# DEX AMM Project

## Overview

This project is a simplified Decentralized Exchange (DEX) built using the Automated Market Maker (AMM) model, similar to Uniswap V2.  
It allows users to add liquidity, remove liquidity, and swap between two ERC-20 tokens without relying on order books or centralized intermediaries.

The pricing mechanism follows the constant product formula (x × y = k), and a 0.3% trading fee is charged on every swap. These fees are earned by liquidity providers.

---

## Features

- Add initial and subsequent liquidity
- Remove liquidity proportionally using LP shares
- Swap between two ERC-20 tokens
- AMM pricing using constant product formula
- 0.3% trading fee for liquidity providers
- LP accounting handled inside the DEX contract
- Emits required events (LiquidityAdded, LiquidityRemoved, Swap)
- Handles edge cases and invalid inputs
- Fully tested with 25+ automated test cases
- Docker support for easy testing

---

## Smart Contracts

### DEX.sol
- Core contract implementing AMM logic
- Manages reserves of both tokens
- Handles liquidity, swaps, and fee accumulation
- Tracks LP balances internally

### MockERC20.sol
- Simple ERC-20 token used for testing
- Allows minting tokens for test scenarios

---

## How AMM Works

The pool always maintains the equation:

reserveA × reserveB = k

The price of tokens changes automatically based on pool reserves.

### Swap Formula (with fee)

amountInWithFee = amountIn × 997  
amountOut = (amountInWithFee × reserveOut) / (reserveIn × 1000 + amountInWithFee)

- 0.3% fee remains in the pool
- Pool value increases over time
- Liquidity providers earn fees

---

## LP Token Logic

### Initial Liquidity

LP minted = sqrt(amountA × amountB)

### Subsequent Liquidity

LP minted = (amountA × totalLiquidity) / reserveA

### Liquidity Removal

amountA = (LP burned × reserveA) / totalLiquidity  
amountB = (LP burned × reserveB) / totalLiquidity

---

## Project Structure

dex-amm/
├── contracts/
│   ├── DEX.sol
│   └── MockERC20.sol
├── test/
│   └── DEX.test.js
├── Dockerfile
├── docker-compose.yml
├── hardhat.config.js
├── package.json
└── README.md

---

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- Git

---

### Run Using Docker (Recommended)

docker-compose up -d  
docker-compose exec app npm run compile  
docker-compose exec app npm test  
docker-compose down  

---

### Run Locally (Without Docker)

npm install  
npx hardhat compile  
npx hardhat test  

---

## Testing

- 25+ test cases implemented
- Covers liquidity, swaps, fees, price updates, events, and edge cases
- All tests pass successfully

Example output:  
25 passing

---

## Security Considerations

- Prevents zero-value inputs
- Restricts unauthorized liquidity removal
- Uses Solidity 0.8+ overflow protection
- Reserves updated internally (not via balanceOf)
- Fee logic verified through tests

---

## Limitations

- Supports only one token pair
- No slippage protection implemented
- No frontend UI (contract-level project)

---

## Future Enhancements

- Add slippage protection
- Support multiple pools
- Implement LP token as ERC-20
- Build frontend using React + Ethers.js
- Add governance features

---

## Author

Patnala Kousalya  
GitHub: https://github.com/Patnala-kousalya

---

## License

MIT License
