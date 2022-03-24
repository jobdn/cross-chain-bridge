import { ethers } from "hardhat";
import { config } from "../config";
import { Bridge, Bridge__factory, ERC20, ERC20__factory } from "../typechain";

async function main() {
  const Bridge = (await ethers.getContractFactory("Bridge")) as Bridge__factory;
  // Change the token address in ../config.ts
  const bridge = (await Bridge.deploy(config.ETH_TOKEN)) as Bridge;

  await bridge.deployed();

  console.log("Bridge deployed to:", bridge.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
