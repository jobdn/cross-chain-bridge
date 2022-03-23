import { ethers } from "hardhat";
import { ERC20, ERC20__factory } from "../typechain";

async function main() {
  const ERC20 = (await ethers.getContractFactory("ERC20")) as ERC20__factory;
  const erc20 = (await ERC20.deploy("Dan-Token", "DTKN", 2)) as ERC20;

  await erc20.deployed();

  console.log("Greeter deployed to:", erc20.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
