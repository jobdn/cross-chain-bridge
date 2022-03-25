import { ethers } from "hardhat";
import { task } from "hardhat/config";
import { config } from "../config";
import { Bridge } from "../typechain";

task("redeem", "Redeem tokens from another network")
    .addParam("recipient", "Recipient of tokens")
    .addParam("amount", "Amount of tokens")
    .addParam("chainFrom", "Chain id from which tokens are sent")
    .addParam("chainTo", "Chain id in which tokens are sent")
    .addParam("symbol", "Symbol of token")
    .addParam("nonce", "Some number to different messages hash")
    .addParam("signature", "Signature from backend you received")
    .setAction(async (taskArgs, hre) => {
        const { recipient, amount, chainFrom, chainTo, symbol, nonce, signature } = taskArgs;
        const { v, r, s } = hre.ethers.utils.splitSignature(signature);
        const bridge = (await hre.ethers.getContractAt(
            "Bridge",
            config.ETH_BRIDGE
        )) as Bridge;

        await bridge.redeem(recipient, amount, chainFrom, chainTo, symbol, nonce, v, r, s);
        console.log(`${recipient} gets ${amount} tokens`);
    });
