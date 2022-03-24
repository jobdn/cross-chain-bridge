import { task } from "hardhat/config";
import { config } from "../config";
import { Bridge } from "../typechain";

task("swap", "Swap tokens from one chain to another")
  .addParam("recipient", "Recipient of tokens")
  .addParam("amount", "Amount of tokens")
  .addParam("chainFrom", "Chain id from which tokens are sent")
  .addParam("chainTo", "Chain id in which tokens are sent")
  .addParam("symbol", "Symbol of token")
  .addParam("nonce", "Some number to different messages hash")
  .setAction(async (taskArgs, hre) => {
    const { recipient, amount, chainFrom, chainTo, symbol, nonce } = taskArgs;
    const bridge = (await hre.ethers.getContractAt(
      "Bridge",
      config.BRIDGE
    )) as Bridge;

    await bridge.swap(recipient, amount, chainFrom, chainTo, symbol, nonce);
    console.log(``);
  });