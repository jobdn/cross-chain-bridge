import { ethers } from "hardhat";
import { config } from "../config";
import { Bridge, Bridge__factory } from "../typechain";

async function main() {
  const Bridge = (await ethers.getContractFactory("Bridge")) as Bridge__factory;
  // Change the token address here. See ../config.ts
  const bridge = (
    await Bridge.deploy(
      /*config.ETH_TOKEN,*/
      config.BSC_TOKEN
    )
  ) as Bridge;

  await bridge.deployed();

  console.log("Bridge deployed to:", bridge.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
