import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { Bridge, Bridge__factory, ERC20, ERC20__factory } from "../typechain";
import { SwapInitializedEvent } from "../typechain/Bridge";

/**
 * TODO:
 *  - Задеплоить в тестовую сеть
    - Написать таск на swap, redeem
    - Верифицировать контракт
    - Дописать тест, если msg.sender == recipient
 */

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

  interface SwapEventArgs {
    recipient: string;
    amount: BigNumberish;
    chainFrom: number;
    chainTo: number;
    symbol: string;
    nonce: number;
  }

  const swap = async (
    recipient: string,
    amount: BigNumberish,
    nonce: number
  ): Promise<SwapInitializedEvent> => {
    const swapTx = await ethBridge.swap(
      recipient,
      amount,
      ETHER_CHAIN_ID,
      BSC_CHAIN_ID,
      await ethToken.symbol(),
      nonce
    );

    const receipt = await swapTx.wait();
    const event = receipt.events?.find(x => x.event === "SwapInitialized") as SwapInitializedEvent;
    return event;
  };

  describe("Swap", () => {
    it("Should call swap", async () => {
      await swap(owner.address, ethers.utils.parseEther("0.1"), 1);
      expect(await ethToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.9")
      );
    });

    it("Should fail if existing transaction", async () => {
      await swap(owner.address, ethers.utils.parseEther("0.1"), 1);
      await expect(
        swap(owner.address, ethers.utils.parseEther("0.1"), 1)
      ).to.be.revertedWith("Existing transaction");
    });
  });

  const redeem = async (
    recipient: string,
    amount: BigNumberish,
    chainFrom: number,
    chainTo: number,
    symbol: string,
    nonce: number,
    sender: SignerWithAddress = owner
  ) => {
    const msg = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "uint256", "string", "uint256"],
      [
        recipient,
        amount,
        chainFrom,
        chainTo,
        symbol,
        nonce,
      ]
    );
    const signedMsg = await backend.signMessage(ethers.utils.arrayify(msg));
    const { v, r, s } = ethers.utils.splitSignature(signedMsg);

    await bscBridge.connect(sender).redeem(
      recipient,
      amount,
      chainFrom,
      chainTo,
      symbol,
      nonce,
      v,
      r,
      s
    );
  };

  describe("Redeem", () => {
    it("Should call redeem", async () => {
      const { recipient, amount, chainFrom, chainTo, symbol, nonce } = (await swap(owner.address, ethers.utils.parseEther("0.1"), 1)).args;
      await bscBridge.setValidator(backend.address);
      await redeem(recipient, amount, chainFrom.toNumber(), chainTo.toNumber(), symbol, nonce.toNumber());
      expect(await bscToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.1")
      );
    });

    it("Should fail if sender is not recipient", async () => {
      const { recipient, amount, chainFrom, chainTo, symbol, nonce } = (await swap(owner.address, ethers.utils.parseEther("0.1"), 1)).args;
      await bscBridge.setValidator(backend.address);
      await expect(
        redeem(
          recipient,
          amount,
          chainFrom.toNumber(),
          chainTo.toNumber(),
          symbol,
          nonce.toNumber(),
          acc1
        )
      ).to.be.revertedWith("Not recipient");
      expect(await bscToken.balanceOf(owner.address)).to.equal(
        0
      );
    })

    it("Should fail if send two the same transactions", async () => {
      const { recipient, amount, chainFrom, chainTo, symbol, nonce } = (await swap(owner.address, ethers.utils.parseEther("0.1"), 1)).args;
      await bscBridge.setValidator(backend.address);
      await redeem(
        recipient,
        amount,
        chainFrom.toNumber(),
        chainTo.toNumber(),
        symbol,
        nonce.toNumber(),
      )
      await expect(
        redeem(
          recipient,
          amount,
          chainFrom.toNumber(),
          chainTo.toNumber(),
          symbol,
          nonce.toNumber(),
        )
      ).to.be.revertedWith("Existing transaction");
    });

    it("Should fail if wrong signature", async () => {
      // await bscBridge.setValidator(backend.address);
      await expect(
        redeem(owner.address, ethers.utils.parseUnits("0.1", "ether"), 1, 2, "SYM", 2)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should fail if not admin try send the validator address", async () => {
      await expect(
        bscBridge.connect(acc1).setValidator(backend.address)
      ).to.be.revertedWith("Not admin");
    });
  });

  describe('Include, exclude and change token', () => {
    it("Should change token", async () => {
      await ethBridge.changeToken(ethToken.address);
    })
  })
});
