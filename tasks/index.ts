import { task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";

task("approve", "approve tokens to address")
    .addParam("tokenaddress", "address of token")
    .addParam("amount", "amount of token to approve")
    .addParam("to", "user aprrove to")
    .setAction(async (args, { ethers }) => {
        const { tokenaddress, amount, to } = args;
        const [signer] = await ethers.getSigners();

        const token = await ethers.getContractAt("ERC20Token", tokenaddress, signer);
        const tx = await token.approve(to, amount);

        console.log("approved");
        console.log(tx);
    });

task("mint", "mint tokens to address")
    .addParam("tokenaddress", "address of token")
    .addParam("amount", "amount of token to mint")
    .addParam("to", "user mint to")
    .setAction(async (args, { ethers }) => {
        const { tokenaddress, amount, to } = args;
        const [signer] = await ethers.getSigners();

        const token = await ethers.getContractAt("ERC20Token", tokenaddress, signer);
        const tx = await token.mint(to, amount);

        console.log("minted");
        console.log(tx);
    });

task("balance", "mint tokens to address")
    .addParam("tokenaddress", "address of token")
    .addParam("user", "user address to check balance")
    .setAction(async (args, { ethers }) => {
        const { tokenaddress, user } = args;
        const [signer] = await ethers.getSigners();

        const token = await ethers.getContractAt("ERC20Token", tokenaddress, signer);
        const balance = await token.balanceOf(user);

        console.log("balance", balance);
    });

task("stake", "stake tokens")
    .addParam("address", "contract address")
    .addParam("amount", "tokens amount")
    .setAction(async ({ address, amount }, { ethers }) => {
        const [signer] = await ethers.getSigners()

        const staking = await ethers.getContractAt("Staking", address, signer);
        const tx = await staking.stake(amount)

        console.log("staked");
        console.log(tx)
    });

task("unstake", "unstake tokens")
    .addParam("address", "contract address")
    .setAction(async ({ address }, { ethers }) => {
        const [signer] = await ethers.getSigners()

        const staking = await ethers.getContractAt("Staking", address, signer);
        const tx = await staking.unstake();

        console.log("unstaked");
        console.log(tx)  
    });

task("claim", "claim tokens")
    .addParam("address", "contract address")
    .setAction(async ({ address }, { ethers }) => {
        const [signer] = await ethers.getSigners()

        const staking = await ethers.getContractAt("Staking", address, signer);
        const tx = await staking.claim();

        console.log("claimed");
        console.log(tx)  
    });