import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { Bridge, Bridge__factory, ERC20, ERC20__factory } from "../typechain";
import { SwapInitializedEvent } from "../typechain/Bridge";

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
    const event = receipt.events?.find(
      (x) => x.event === "SwapInitialized"
    ) as SwapInitializedEvent;
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

  const getSignature = async (
    recipient: string,
    amount: BigNumberish,
    chainFrom: number,
    chainTo: number,
    symbol: string,
    nonce: number
    // sender: SignerWithAddress = owner
  ): Promise<string> => {
    const msg = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "uint256", "string", "uint256"],
      [recipient, amount, chainFrom, chainTo, symbol, nonce]
    );
    return await backend.signMessage(ethers.utils.arrayify(msg));
  };

  describe("Redeem", () => {
    it("Should call redeem", async () => {
      // User call the swap function and event emits
      const event = await swap(
        owner.address,
        ethers.utils.parseEther("0.1"),
        1
      );
      const { recipient, amount, chainFrom, chainTo, symbol, nonce } =
        event.args;
      await bscBridge.setValidator(backend.address);
      // Get signature using the event arguments
      const signature = await getSignature(
        recipient,
        amount,
        chainFrom.toNumber(),
        chainTo.toNumber(),
        symbol,
        nonce.toNumber()
      );
      const { v, r, s } = ethers.utils.splitSignature(signature);
      await bscBridge.redeem(
        recipient,
        amount,
        chainFrom.toNumber(),
        chainTo.toNumber(),
        symbol,
        nonce.toNumber(),
        v,
        r,
        s
      );
      expect(await bscToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.1")
      );
    });

    it("Should fail if sender is not recipient", async () => {
      // User call the swap function and event emits
      const event = await swap(
        owner.address,
        ethers.utils.parseEther("0.1"),
        1
      );
      const { recipient, amount, chainFrom, chainTo, symbol, nonce } =
        event.args;
      await bscBridge.setValidator(backend.address);
      // Get signature using the event arguments
      const signature = await getSignature(
        recipient,
        amount,
        chainFrom.toNumber(),
        chainTo.toNumber(),
        symbol,
        nonce.toNumber()
      );
      const { v, r, s } = ethers.utils.splitSignature(signature);

      await expect(
        bscBridge
          .connect(acc1)
          .redeem(
            recipient,
            amount,
            chainFrom.toNumber(),
            chainTo.toNumber(),
            symbol,
            nonce.toNumber(),
            v,
            r,
            s
          )
      ).to.be.revertedWith("Not recipient");
      expect(await bscToken.balanceOf(owner.address)).to.equal(0);
    });

    it("Should fail if send two the same transactions", async () => {
      // User call the swap function and event emits
      const event = await swap(
        owner.address,
        ethers.utils.parseEther("0.1"),
        1
      );
      const { recipient, amount, chainFrom, chainTo, symbol, nonce } =
        event.args;
      await bscBridge.setValidator(backend.address);
      // Get signature using the event arguments
      const signature = await getSignature(
        recipient,
        amount,
        chainFrom.toNumber(),
        chainTo.toNumber(),
        symbol,
        nonce.toNumber()
      );
      const { v, r, s } = ethers.utils.splitSignature(signature);

      await bscBridge.redeem(recipient, amount,
        chainFrom.toNumber(),
        chainTo.toNumber(),
        symbol,
        nonce.toNumber(),
        v,
        r,
        s
      );
      await expect(
        bscBridge.redeem(
          recipient,
          amount,
          chainFrom.toNumber(),
          chainTo.toNumber(),
          symbol,
          nonce.toNumber(),
          v,
          r,
          s
        )
      ).to.be.revertedWith("Existing transaction");
    });

    it("Should fail if wrong signature", async () => {
      // User call the swap function and event emits
      const event = await swap(
        owner.address,
        ethers.utils.parseEther("0.1"),
        1
      );
      const { recipient, amount, chainFrom, chainTo, symbol, nonce } =
        event.args;
      await bscBridge.setValidator(backend.address);
      // Get signature using the event arguments
      const signature = await getSignature(
        recipient,
        amount,
        chainFrom.toNumber(),
        chainTo.toNumber(),
        symbol,
        nonce.toNumber()
      );
      const { v, r, s } = ethers.utils.splitSignature(signature);

      await bscBridge.setValidator(backend.address);
      await expect(
        bscBridge.redeem(
          recipient,
          amount,
          chainFrom.toNumber(),
          chainTo.toNumber(),
          symbol,
          // Wrong nonce
          nonce.toNumber() + 1,
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

  describe("Change token", () => {
    it("Should change token", async () => {
      await ethBridge.changeToken(ethToken.address);
    });
  });
});
