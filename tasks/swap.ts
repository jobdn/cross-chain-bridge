import { task } from "hardhat/config";
import { config } from "../config";
import { Bridge } from "../typechain";

task("swap", "Swap tokens from one chain to another")
  .addParam("recipient", "Recipient of tokens")
  .addParam("amount", "Amount of tokens")
  .addParam("chainTo", "Chain id in which tokens are sent")
  .addParam("symbol", "Symbol of token")
  .addParam("nonce", "Some number to different messages hash")
  .setAction(async (taskArgs, hre) => {
    const { recipient, amount, chainTo, symbol, nonce } = taskArgs;
    const bridge = (await hre.ethers.getContractAt(
      "Bridge",
      config.ETH_BRIDGE
      // config.BSC_BRIDGE
    )) as Bridge;

    await bridge.swap(recipient, amount, chainTo, symbol, nonce);
    console.log(`${amount} tokens can be send to ${recipient}`);
  });
