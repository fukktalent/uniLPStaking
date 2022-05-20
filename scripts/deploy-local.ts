// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { ERC20Token__factory, IUniswapV2Factory, IUniswapV2Pair, IUniswapV2Router02, Staking__factory } from "../typechain-types";

async function main() {
    const [owner] = await ethers.getSigners();

    const router: IUniswapV2Router02 = <IUniswapV2Router02>(await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER_ADDRESS as string));
    const factory: IUniswapV2Factory = <IUniswapV2Factory>(await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY_ADDRESS as string));

    // create tokens
    const tokenOne = await new ERC20Token__factory(owner).deploy("one", "ONE");
    await tokenOne.deployed();
    await tokenOne.mint(owner.address, 1_000_000_000);

    const tokenTwo = await new ERC20Token__factory(owner).deploy("two", "TWO");
    await tokenTwo.deployed();
    await tokenTwo.mint(owner.address, 1_000_000_000);

    // approve tokens
    await tokenOne.approve(router.address, 1_000_000_000);
    await tokenTwo.approve(router.address, 1_000_000_000);

    // add liquidity
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 60;
    await router.addLiquidity(
        tokenOne.address,
        tokenTwo.address,
        1_000_000_000,
        1_000_000_000,
        0,
        0,
        owner.address,
        deadline
    );

    const pairAddress = await factory.getPair(tokenOne.address, tokenTwo.address);
    const pair = <IUniswapV2Pair> await ethers.getContractAt("IUniswapV2Pair", pairAddress);

    const staking = await new Staking__factory(owner).deploy(pairAddress, tokenOne.address);
    await staking.deployed();

    await tokenOne.mint(staking.address, 1_000_000_000);

    await pair.approve(staking.address, ethers.constants.MaxUint256);

    console.log("Voting deployed to:", staking.address);
    console.log("Token ONE address:", tokenOne.address);
    console.log("Token TWO address:", tokenTwo.address);
    console.log("LP token address:", pairAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
