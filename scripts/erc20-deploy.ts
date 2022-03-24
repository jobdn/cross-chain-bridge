import { ethers } from "hardhat";
import { config } from "../config";
import { ERC20, ERC20__factory } from "../typechain";

async function main() {
  const ERC20 = (await ethers.getContractFactory("ERC20")) as ERC20__factory;
  const erc20 = (await ERC20.deploy(
    // Change 'name' and 'symbol' parameters here. See ../config.ts
    config.ETH_TOKEN_NAME,
    config.ETH_TOKEN_SYMBOL,
    config.TOKEN_DECIMALS
  )) as ERC20;

  await erc20.deployed();

  console.log("ERC20 token deployed to:", erc20.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
