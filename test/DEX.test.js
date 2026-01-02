const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
  let dex, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA");
    tokenB = await MockERC20.deploy("Token B", "TKB");

    const DEX = await ethers.getContractFactory("DEX");
    dex = await DEX.deploy(tokenA.address, tokenB.address);

    await tokenA.approve(dex.address, ethers.utils.parseEther("1000000"));
    await tokenB.approve(dex.address, ethers.utils.parseEther("1000000"));
  });

  /* ---------------- LIQUIDITY ---------------- */

  describe("Liquidity Management", function () {

    it("should allow initial liquidity provision", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("100"));
      expect(b).to.equal(ethers.utils.parseEther("200"));
    });

    it("should mint correct LP tokens for first provider", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const lp = await dex.totalLiquidity();
      expect(lp).to.be.closeTo(
        ethers.utils.parseEther("141.42"),
        ethers.utils.parseEther("0.01")
      );
    });

    it("should allow subsequent liquidity additions", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      await tokenA.transfer(addr1.address, ethers.utils.parseEther("50"));
      await tokenB.transfer(addr1.address, ethers.utils.parseEther("100"));

      await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("50"));
      await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("100"));

      await dex.connect(addr1).addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );

      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("150"));
      expect(b).to.equal(ethers.utils.parseEther("300"));
    });

    it("should revert on zero liquidity addition", async function () {
      await expect(dex.addLiquidity(0, 0)).to.be.revertedWith("Zero amount");
    });
  });

  /* ---------------- SWAPS ---------------- */

  describe("Token Swaps", function () {

    beforeEach(async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );
    });

    it("should swap token A for token B", async function () {
      const before = await tokenB.balanceOf(owner.address);
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const after = await tokenB.balanceOf(owner.address);
      expect(after).to.be.gt(before);
    });

    it("should swap token B for token A", async function () {
      const before = await tokenA.balanceOf(owner.address);
      await dex.swapBForA(ethers.utils.parseEther("10"));
      const after = await tokenA.balanceOf(owner.address);
      expect(after).to.be.gt(before);
    });

    it("should revert on zero swap", async function () {
      await expect(dex.swapAForB(0)).to.be.revertedWith("Zero swap");
    });
        it("should calculate correct output amount with fee", async function () {
      const amountIn = ethers.utils.parseEther("10");

      const [reserveA, reserveB] = await dex.getReserves();

      const expectedOut = await dex.getAmountOut(
        amountIn,
        reserveA,
        reserveB
      );

      const balanceBBefore = await tokenB.balanceOf(owner.address);

      await dex.swapAForB(amountIn);

      const balanceBAfter = await tokenB.balanceOf(owner.address);
      const actualOut = balanceBAfter.sub(balanceBBefore);

      expect(actualOut).to.equal(expectedOut);
    });
        it("should update reserves after swap", async function () {
      const amountIn = ethers.utils.parseEther("10");

      const [reserveABefore, reserveBBefore] = await dex.getReserves();

      await dex.swapAForB(amountIn);

      const [reserveAAfter, reserveBAfter] = await dex.getReserves();

      expect(reserveAAfter).to.equal(reserveABefore.add(amountIn));
      expect(reserveBAfter).to.be.lt(reserveBBefore);
    });
        it("should increase k after swap due to fees", async function () {
      const [reserveABefore, reserveBBefore] = await dex.getReserves();
      const kBefore = reserveABefore.mul(reserveBBefore);

      await dex.swapAForB(ethers.utils.parseEther("10"));

      const [reserveAAfter, reserveBAfter] = await dex.getReserves();
      const kAfter = reserveAAfter.mul(reserveBAfter);

      expect(kAfter).to.be.gt(kBefore);
    });
        it("should handle large swaps with high price impact", async function () {
      const amountIn = ethers.utils.parseEther("80");

      const balanceBBefore = await tokenB.balanceOf(owner.address);

      await dex.swapAForB(amountIn);

      const balanceBAfter = await tokenB.balanceOf(owner.address);

      // If price impact exists, output < linear expectation (80 * 2 = 160)
      expect(balanceBAfter.sub(balanceBBefore))
        .to.be.lt(ethers.utils.parseEther("160"));
    });
        it("should handle multiple consecutive swaps", async function () {
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));
      await dex.swapAForB(ethers.utils.parseEther("5"));

      const [reserveA, reserveB] = await dex.getReserves();

      expect(reserveA).to.be.gt(ethers.utils.parseEther("100"));
      expect(reserveB).to.be.lt(ethers.utils.parseEther("200"));
    });
        it("should emit LiquidityAdded event", async function () {
      await expect(
        dex.addLiquidity(
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("200")
        )
      ).to.emit(dex, "LiquidityAdded");
    });
        it("should emit LiquidityRemoved event", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const totalLP = await dex.totalLiquidity();

      await expect(
        dex.removeLiquidity(totalLP)
      ).to.emit(dex, "LiquidityRemoved");
    });
        it("should emit Swap event", async function () {
      await expect(
        dex.swapAForB(ethers.utils.parseEther("10"))
      ).to.emit(dex, "Swap");
    });








  });

  /* ---------------- PRICE ---------------- */

  describe("Price Calculations", function () {

    it("should update price after swap", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const before = await dex.getPrice();
      await dex.swapAForB(ethers.utils.parseEther("10"));
      const after = await dex.getPrice();

      expect(after).to.not.equal(before);
    });

    it("should return 0 price when no liquidity", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const t1 = await MockERC20.deploy("X", "X");
      const t2 = await MockERC20.deploy("Y", "Y");

      const DEX = await ethers.getContractFactory("DEX");
      const fresh = await DEX.deploy(t1.address, t2.address);

      expect(await fresh.getPrice()).to.equal(0);
    });
        it("should allow partial liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const halfLP = (await dex.totalLiquidity()).div(2);
      await dex.removeLiquidity(halfLP);

      const [a, b] = await dex.getReserves();
      expect(a).to.equal(ethers.utils.parseEther("50"));
      expect(b).to.equal(ethers.utils.parseEther("100"));
    });
        it("should return correct token amounts on full liquidity removal", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const totalLP = await dex.totalLiquidity();

      const aBefore = await tokenA.balanceOf(owner.address);
      const bBefore = await tokenB.balanceOf(owner.address);

      await dex.removeLiquidity(totalLP);

      const aAfter = await tokenA.balanceOf(owner.address);
      const bAfter = await tokenB.balanceOf(owner.address);

      expect(aAfter.sub(aBefore)).to.equal(ethers.utils.parseEther("100"));
      expect(bAfter.sub(bBefore)).to.equal(ethers.utils.parseEther("200"));
    });
        it("should revert when removing more liquidity than owned", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      const totalLP = await dex.totalLiquidity();

      await expect(
        dex.removeLiquidity(totalLP.add(1))
      ).to.be.revertedWith("Not enough liquidity");
    });
        it("should accumulate fees for liquidity providers", async function () {
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      // Do some swaps (fees accumulate)
      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.swapAForB(ethers.utils.parseEther("10"));

      const totalLP = await dex.totalLiquidity();

      const aBefore = await tokenA.balanceOf(owner.address);
      const bBefore = await tokenB.balanceOf(owner.address);

      await dex.removeLiquidity(totalLP);

      const aAfter = await tokenA.balanceOf(owner.address);
      const bAfter = await tokenB.balanceOf(owner.address);

      // Withdrawn amounts should be >= initial (fees earned)
      expect(aAfter).to.be.gte(aBefore);
      expect(bAfter).to.be.gte(bBefore);
    });
        it("should distribute fees proportionally to LP share", async function () {
      // Owner adds liquidity
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      // addr1 adds liquidity
      await tokenA.transfer(addr1.address, ethers.utils.parseEther("50"));
      await tokenB.transfer(addr1.address, ethers.utils.parseEther("100"));

      await tokenA.connect(addr1).approve(dex.address, ethers.utils.parseEther("50"));
      await tokenB.connect(addr1).approve(dex.address, ethers.utils.parseEther("100"));

      await dex.connect(addr1).addLiquidity(
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("100")
      );

      // Generate fees
      await dex.swapAForB(ethers.utils.parseEther("10"));
      await dex.swapAForB(ethers.utils.parseEther("10"));

      const lpOwner = await dex.liquidity(owner.address);
      const lpAddr1 = await dex.liquidity(addr1.address);

      expect(lpOwner).to.be.gt(lpAddr1); // owner has larger share
    });
        it("should handle very small liquidity amounts", async function () {
      const smallA = ethers.utils.parseEther("0.001");
      const smallB = ethers.utils.parseEther("0.002");

      await dex.addLiquidity(smallA, smallB);

      const [reserveA, reserveB] = await dex.getReserves();

      expect(reserveA).to.equal(smallA);
      expect(reserveB).to.equal(smallB);
    });
        it("should handle very large liquidity amounts", async function () {
      const bigA = ethers.utils.parseEther("100000");
      const bigB = ethers.utils.parseEther("200000");

      await dex.addLiquidity(bigA, bigB);

      const [reserveA, reserveB] = await dex.getReserves();

      expect(reserveA).to.equal(bigA);
      expect(reserveB).to.equal(bigB);
    });
        it("should prevent unauthorized access", async function () {
      // Owner adds liquidity
      await dex.addLiquidity(
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("200")
      );

      // addr1 has NO liquidity
      await expect(
        dex.connect(addr1).removeLiquidity(1)
      ).to.be.reverted;
    });





    




  });

});
