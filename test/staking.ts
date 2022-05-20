import { expect } from "chai";
import { ethers } from "hardhat";

import { IUniswapV2Factory, IUniswapV2Router02 } from "../typechain-types/interfaces";
import { ERC20Token, ERC20Token__factory, IUniswapV2Pair, Staking__factory, Staking } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "ethers";

describe("Staking", function () {
    const DEF_SETTINGS = {
        FREEZE_PERIOD: 30 * 60,
        REWARD_PERIOD: 10 * 60,
        REWARD_PERCENT: 15,
    };
    const NEW_SETTINGS = {
        FREEZE_PERIOD: 5 * 60,
        REWARD_PERIOD: 3 * 60,
        REWARD_PERCENT: 20,
    };
    const STAKE_AMOUNT = 1_000;

    let staking: Staking;

    let uniRouter: IUniswapV2Router02;
    let uniFactory: IUniswapV2Factory;

    let owner: SignerWithAddress;
    let user: SignerWithAddress;

    let tokenOne: ERC20Token;
    let tokenTwo: ERC20Token;
    let pair: IUniswapV2Pair;

    before(async function () {
        uniRouter = <IUniswapV2Router02>(await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER_ADDRESS as string));
        uniFactory = <IUniswapV2Factory>(await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY_ADDRESS as string));

        [owner, user] = await ethers.getSigners();

        // create and mint two erc20 tokens
        tokenOne = await new ERC20Token__factory(owner).deploy("Token one", "TONE");
        await tokenOne.deployed();
        tokenOne.connect(owner).mint(owner.address, 1_000_000_000);

        tokenTwo = await new ERC20Token__factory(owner).deploy("Token two", "TTWO");
        await tokenTwo.deployed();
        tokenTwo.mint(owner.address, 1_000_000_000);

        expect(await tokenOne.balanceOf(owner.address)).to.be.equal(1_000_000_000);
        expect(await tokenTwo.balanceOf(owner.address)).to.be.equal(1_000_000_000);

        // creating liquidity pool
        await tokenOne.approve(uniRouter.address, ethers.constants.MaxUint256);
        await tokenTwo.approve(uniRouter.address, ethers.constants.MaxUint256);

        expect(await tokenOne.allowance(owner.address, uniRouter.address)).to.be.equal(ethers.constants.MaxUint256);
        expect(await tokenTwo.allowance(owner.address, uniRouter.address)).to.be.equal(ethers.constants.MaxUint256);

        const deadline: BigNumberish = (await ethers.provider.getBlock("latest")).timestamp + 60;
        await uniRouter.connect(owner).addLiquidity(
            tokenOne.address,
            tokenTwo.address,
            1_000_000,
            1_000_000,
            0,
            0,
            owner.address, 
            deadline
        );

        // get lp pair contract
        const pairAddress: string = await uniFactory.getPair(tokenOne.address, tokenTwo.address);
        pair = <IUniswapV2Pair> await ethers.getContractAt("IUniswapV2Pair", pairAddress);
        const pairBalance = await pair.balanceOf(owner.address);
        expect(pairBalance).to.be.equal(1_000_000 - 1_000);
        const { reserve0, reserve1 } = await pair.getReserves();
        expect(reserve0).to.be.equal(1_000_000);
        expect(reserve1).to.be.equal(1_000_000);
    });

    it("Should deploy contract", async function () {
        staking = await new Staking__factory(owner).deploy(pair.address, tokenOne.address);
        await staking.deployed();

        expect(await staking.owner()).to.be.equal(owner.address);
        expect(await staking.freezePeriod()).to.be.equal(DEF_SETTINGS.FREEZE_PERIOD);
        expect(await staking.rewardPeriod()).to.be.equal(DEF_SETTINGS.REWARD_PERIOD);
        expect(await staking.rewardPercent()).to.be.equal(DEF_SETTINGS.REWARD_PERCENT);
    });

    it("Should approve lp to staking contract", async function () {
        await pair.approve(staking.address, STAKE_AMOUNT);
        expect(await pair.allowance(owner.address, staking.address)).to.be.equal(STAKE_AMOUNT);
    });

    it("Should mint reward tokens to staking contract", async function () {
        await tokenOne.mint(staking.address, 1_000_000_000);
        expect(await tokenOne.balanceOf(staking.address)).to.be.equal(1_000_000_000);
    });


    describe("freezePeriod", function () {
        it("Should set freeze period", async function () {
            await staking.setFreezePeriod(NEW_SETTINGS.FREEZE_PERIOD);
            const freezePeriod = await staking.freezePeriod();
            expect(freezePeriod).to.be.equal(NEW_SETTINGS.FREEZE_PERIOD);
        });

        it("Should revert with no owner error", async function () {
            const freezePeriod = await staking.freezePeriod();

            const tx = staking.connect(user).setFreezePeriod(NEW_SETTINGS.FREEZE_PERIOD);
            await expect(tx).to.be.revertedWith("only owner allowed");

            const newFreezePeriod = await staking.freezePeriod();
            expect(newFreezePeriod).to.be.equal(freezePeriod);
        });
    });

    describe("rewardPeriod", function () {
        it("Should set reward period", async function () {
            await staking.setRewardPeriod(NEW_SETTINGS.REWARD_PERIOD);
            const rewardPeriod = await staking.rewardPeriod();
            expect(rewardPeriod).to.be.equal(NEW_SETTINGS.REWARD_PERIOD);
        });

        it("Should revert with no owner error", async function () {
            const rewardPeriod = await staking.rewardPeriod();

            const tx = staking.connect(user).setRewardPeriod(NEW_SETTINGS.REWARD_PERIOD);
            await expect(tx).to.be.revertedWith("only owner allowed");

            const newRewardPeriod = await staking.rewardPeriod();
            expect(newRewardPeriod).to.be.equal(rewardPeriod);
        });
    });

    describe("rewardPercent", function () {
        it("Should set reward percent", async function () {
            await staking.setRewardPercent(NEW_SETTINGS.REWARD_PERCENT);
            const rewardPercent = await staking.rewardPercent();
            expect(rewardPercent).to.be.equal(NEW_SETTINGS.REWARD_PERCENT);
        });

        it("Should revert with no owner error", async function () {
            const rewardPercent = await staking.rewardPercent();

            const tx = staking.connect(user).setRewardPercent(5 * 60);
            await expect(tx).to.be.revertedWith("only owner allowed");

            const newRewardPercent = await staking.rewardPercent();
            expect(newRewardPercent).to.be.equal(rewardPercent);
        });
    });

    describe("stake", function() {
        it("Should stake lp tokens", async function () {
            const userBalance = await pair.balanceOf(owner.address);
            const stakingBalance = await pair.balanceOf(staking.address);

            const tx = staking.stake(STAKE_AMOUNT);
            await expect(tx).to.emit(staking, "Staked").withArgs(owner.address, STAKE_AMOUNT);

            expect(await pair.balanceOf(owner.address)).to.be.equal(
              userBalance.sub(STAKE_AMOUNT)
            );
            expect(await pair.balanceOf(staking.address)).to.be.equal(
              stakingBalance.add(STAKE_AMOUNT)
            );

            const stakeData = await staking.getStakeData();
            expect(stakeData.lpAmount).to.be.equal(STAKE_AMOUNT);
            expect(stakeData.rewardAmount).to.be.equal(0);
        });

        it("Should reverted with not enough allowed", async function () {
            const tx = staking.stake(STAKE_AMOUNT);
            await expect(tx).to.be.revertedWith("not enough allowed");
        });

        it("Should reverted with not enough balance", async function () {
            const balance = await pair.balanceOf(owner.address);
            const tx = staking.stake(balance.add(1));
            await expect(tx).to.be.revertedWith("not enough balance");
        });
    });

    describe("claim", function() {
        it("Should revert with nothing to claim", async function () {
            const tx = staking.claim();
            await expect(tx).to.be.revertedWith("nothing to claim");
        });

        it("Should claim reward for first reward period", async function () {
            await ethers.provider.send("evm_increaseTime", [3 * 60]);
            await ethers.provider.send("evm_mine", []);

            const userBalance = await tokenOne.balanceOf(owner.address);
            const stakingBalance = await tokenOne.balanceOf(staking.address);

            const tx = staking.claim();
            await expect(tx).to.emit(staking, "Claimed").withArgs(
                owner.address, 
                STAKE_AMOUNT * NEW_SETTINGS.REWARD_PERCENT / 100
            );

            expect(await tokenOne.balanceOf(owner.address)).to.be.equal(
              userBalance.add(STAKE_AMOUNT * NEW_SETTINGS.REWARD_PERCENT / 100)
            );
            expect(await tokenOne.balanceOf(staking.address)).to.be.equal(
              stakingBalance.sub(STAKE_AMOUNT * NEW_SETTINGS.REWARD_PERCENT / 100)
            );
        });

        it("Should claim reward for nine reward periods", async function () {
            await ethers.provider.send("evm_increaseTime", [3 * 60 * 9]);
            await ethers.provider.send("evm_mine", []);

            const tx = staking.claim();
            await expect(tx).to.emit(staking, "Claimed").withArgs(
                owner.address, 
                STAKE_AMOUNT * NEW_SETTINGS.REWARD_PERCENT / 100 * 9
            );
        });

        it("Should claim reward for five reward periods and five x2 balance reward periods", async function () {
            await ethers.provider.send("evm_increaseTime", [3 * 60 * 5]);
            await ethers.provider.send("evm_mine", []);

            await pair.approve(staking.address, STAKE_AMOUNT);
            await staking.stake(STAKE_AMOUNT);

            await ethers.provider.send("evm_increaseTime", [3 * 60 * 5]);
            await ethers.provider.send("evm_mine", []);

            const tx = staking.claim();
            await expect(tx).to.emit(staking, "Claimed").withArgs(
                owner.address, 
                STAKE_AMOUNT * NEW_SETTINGS.REWARD_PERCENT / 100 * 15
            );
        });
    });

    describe("unstake", function() {
        it("Should revert with tokens still freezed", async function () {    
            const tx = staking.unstake();
            await expect(tx).to.be.revertedWith("tokens still freezed");
        });

        it("Should unstake tokens to owner", async function () {    
            await ethers.provider.send("evm_increaseTime", [3 * 60 * 5]);
            await ethers.provider.send("evm_mine", []);

            const userBalance = await pair.balanceOf(owner.address);
            const stakingBalance = await pair.balanceOf(staking.address);

            const tx = await staking.connect(owner).unstake();
            await expect(tx).to.emit(staking, "Unstaked").withArgs(
                owner.address, 
                STAKE_AMOUNT * 2
            );

            await ethers.provider.send("evm_increaseTime", [3 * 60 * 5]);
            await ethers.provider.send("evm_mine", []);

            expect(await pair.balanceOf(owner.address)).to.be.equal(
              userBalance.add(STAKE_AMOUNT * 2)
            );
            expect(await pair.balanceOf(staking.address)).to.be.equal(
              stakingBalance.sub(STAKE_AMOUNT * 2)
            );

            const stakeData = await staking.getStakeData();
            expect(stakeData.lpAmount).to.be.equal(0);
        });
    });
});
