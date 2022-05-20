import * as dotenv from "dotenv";

import { ethers } from "hardhat";
import { Staking__factory } from "../typechain-types";

dotenv.config();

const DEF_REWARD_TOKEN_ADDRESS: string = "0xCFf5814533944ca7AAfe586d9920C7f585Ba0ab5";
const DEF_LP_TOKEN_ADDRESS: string = "0x2be5124D0E9449Fc718D5562b70b6a4A3aDB95da"

async function main() {
    const [owner] = await ethers.getSigners();

    const staking = await new Staking__factory(owner).deploy(
      process.env.LP_TOKEN_ADDRESS || DEF_LP_TOKEN_ADDRESS, 
      process.env.REWARD_TOKEN_ADDRESS || DEF_REWARD_TOKEN_ADDRESS,
    );
    await staking.deployed();

    console.log(process.env.LP_TOKEN_ADDRESS);
    console.log(process.env.REWARD_TOKEN_ADDRESS);
    console.log("Staking deployed to:", staking.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
