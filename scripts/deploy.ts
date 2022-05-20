import * as dotenv from "dotenv";

import { ethers } from "hardhat";

dotenv.config();

const DEF_REWARD_TOKEN_ADDRESS: string = "0xCFf5814533944ca7AAfe586d9920C7f585Ba0ab5";
const DEF_LP_TOKEN_ADDRESS: string = "0x2be5124D0E9449Fc718D5562b70b6a4A3aDB95da"

async function main() {
    const [owner] = await ethers.getSigners();

    const stakingFactory = await ethers.getContractFactory("Staking", owner);
    const staking = await stakingFactory.deploy(
      process.env.LP_TOKEN_ADDRESS || DEF_LP_TOKEN_ADDRESS, 
      process.env.REWARD_TOKEN_ADDRESS || DEF_REWARD_TOKEN_ADDRESS,
    ); 
    await staking.deployed();

    console.log("Staking deployed to:", staking.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
