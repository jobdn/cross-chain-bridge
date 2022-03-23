import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Bridge, Bridge__factory, ERC20, ERC20__factory } from "../typechain";

describe("Bridge", function () {
  let ethBridge: Bridge,
    bscBridge: Bridge,
    ethToken: ERC20,
    bscToken: ERC20,
    owner: SignerWithAddress,
    backend: SignerWithAddress,
    acc1: SignerWithAddress;
  const ETHER_CHAIN_ID = 1;
  const BSC_CHAIN_ID = 2;

  beforeEach(async () => {
    [owner, backend, acc1] = await ethers.getSigners();

    const EthTokenFactory = (await ethers.getContractFactory(
      "ERC20"
    )) as ERC20__factory;
    const BscTokenFactory = (await ethers.getContractFactory(
      "ERC20"
    )) as ERC20__factory;
    ethToken = await EthTokenFactory.deploy("ETHER TOKEN", "ETHT", 2);
    bscToken = await BscTokenFactory.deploy("BINANCE TOKEN", "BSCT", 2);
    await ethToken.deployed();
    await ethToken.mint(owner.address, ethers.utils.parseEther("1"));
    expect(await ethToken.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("1")
    );
    await bscToken.deployed();

    const EthBridgeFactory = (await ethers.getContractFactory(
      "Bridge"
    )) as Bridge__factory;
    const BscBridgeFactory = (await ethers.getContractFactory(
      "Bridge"
    )) as Bridge__factory;
    ethBridge = (await EthBridgeFactory.deploy(ethToken.address)) as Bridge;
    bscBridge = (await BscBridgeFactory.deploy(bscToken.address)) as Bridge;
    await ethBridge.deployed();
    await bscBridge.deployed();

    await ethToken.setMinterAndBurnerRoles(ethBridge.address);
    await bscToken.setMinterAndBurnerRoles(bscBridge.address);
  });

  describe("Swap", () => {
    it("Should call swap", async () => {
      await ethBridge.swap(
        owner.address,
        ethers.utils.parseEther("0.1"),
        ETHER_CHAIN_ID,
        BSC_CHAIN_ID,
        await ethToken.symbol(),
        1
      );
      expect(await ethToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.9")
      );

      // TODO: check emited event
    });

    it("Should fail if existing transaction", async () => {
      await ethBridge.swap(
        owner.address,
        ethers.utils.parseEther("0.1"),
        ETHER_CHAIN_ID,
        BSC_CHAIN_ID,
        await ethToken.symbol(),
        1
      );
      await expect(
        ethBridge.swap(
          owner.address,
          ethers.utils.parseEther("0.1"),
          ETHER_CHAIN_ID,
          BSC_CHAIN_ID,
          await ethToken.symbol(),
          1
        )
      ).to.be.revertedWith("Existing transaction");
    });
  });

  describe("Redeem", () => {
    const swapAndRedeem = async () => {
      await ethBridge.swap(
        owner.address,
        ethers.utils.parseEther("0.1"),
        ETHER_CHAIN_ID,
        BSC_CHAIN_ID,
        await ethToken.symbol(),
        1
      );
      // Set validator. It is the backend address
      await bscBridge.setValidator(backend.address);
      const msg = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256", "uint256", "string", "uint256"],
        [
          owner.address,
          ethers.utils.parseEther("0.1"),
          ETHER_CHAIN_ID,
          BSC_CHAIN_ID,
          await ethToken.symbol(),
          1,
        ]
      );
      const signedMsg = await backend.signMessage(ethers.utils.arrayify(msg));
      const { v, r, s } = ethers.utils.splitSignature(signedMsg);

      await bscBridge.redeem(
        owner.address,
        ethers.utils.parseEther("0.1"),
        ETHER_CHAIN_ID,
        BSC_CHAIN_ID,
        await ethToken.symbol(),
        1,
        v,
        r,
        s
      );

      expect(await bscToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.1")
      );
    };
    it("Should call redeem", async () => {
      await swapAndRedeem();
    });

    it("Should fail if send two the same transactions", async () => {
      const v = 28;
      const r =
        "0x8934ae4bf1457bbc2b551f4b2226bcf0f1b52c7033570f32c1c843e9411bbb6e";
      const s =
        "0x5163a22691d3b38e3afec1420b264e26a1cb2a69d92fe125257d095a947a33d7";
      await swapAndRedeem();
      await expect(
        bscBridge.redeem(
          owner.address,
          ethers.utils.parseEther("0.1"),
          ETHER_CHAIN_ID,
          BSC_CHAIN_ID,
          await ethToken.symbol(),
          1,
          v,
          r,
          s
        )
      ).to.be.revertedWith("Existing transaction");
    });

    it("Should fail if wrong signature", async () => {
      const v = 20;
      const r =
        "0x8934ae4bf1457bbc2b551f4b2226bcf0f1b52c7033570f32c1c843e9411bbb6e";
      const s =
        "0x5163a22691d3b38e3afec1420b264e26a1cb2a69d92fe125257d095a947a33d7";
      await swapAndRedeem();
      await expect(
        bscBridge.redeem(
          owner.address,
          // There is changing here
          ethers.utils.parseEther("0.2"),
          ETHER_CHAIN_ID,
          BSC_CHAIN_ID,
          await ethToken.symbol(),
          1,
          v,
          r,
          s
        )
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should fail if not admin try send the validator address", async () => {
      await expect(
        bscBridge.connect(acc1).setValidator(backend.address)
      ).to.be.revertedWith("Not admin");
    });
  });
});
