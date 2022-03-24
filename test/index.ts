import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish } from "ethers";
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

  const swap = async (
    recipient: string,
    amount: BigNumberish,
    nonce: number
  ) => {
    await ethBridge.swap(
      recipient,
      amount,
      ETHER_CHAIN_ID,
      BSC_CHAIN_ID,
      await ethToken.symbol(),
      nonce
    );
  };

  describe("Swap", () => {
    it("Should call swap", async () => {
      await swap(owner.address, ethers.utils.parseEther("0.1"), 1);
      expect(await ethToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.9")
      );

      // TODO: check emited event
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
    nonce: number
  ) => {
    const msg = ethers.utils.solidityKeccak256(
      ["address", "uint256", "uint256", "uint256", "string", "uint256"],
      [
        recipient,
        amount,
        ETHER_CHAIN_ID,
        BSC_CHAIN_ID,
        await ethToken.symbol(),
        nonce,
      ]
    );
    const signedMsg = await backend.signMessage(ethers.utils.arrayify(msg));
    const { v, r, s } = ethers.utils.splitSignature(signedMsg);

    await bscBridge.redeem(
      recipient,
      amount,
      ETHER_CHAIN_ID,
      BSC_CHAIN_ID,
      await ethToken.symbol(),
      nonce,
      v,
      r,
      s
    );
  };

  describe("Redeem", () => {
    it("Should call redeem", async () => {
      await swap(owner.address, ethers.utils.parseEther("0.1"), 1);
      await bscBridge.setValidator(backend.address);
      await redeem(owner.address, ethers.utils.parseUnits("0.1", "ether"), 1);
      expect(await bscToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.1")
      );

      await swap(owner.address, ethers.utils.parseEther("0.1"), 2);
      await bscBridge.setValidator(backend.address);
      await redeem(owner.address, ethers.utils.parseUnits("0.1", "ether"), 2);
      expect(await bscToken.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("0.2")
      );
    });

    it("Should fail if send two the same transactions", async () => {
      await swap(owner.address, ethers.utils.parseEther("0.1"), 1);
      await bscBridge.setValidator(backend.address);
      await redeem(owner.address, ethers.utils.parseUnits("0.1", "ether"), 1);
      await expect(
        redeem(owner.address, ethers.utils.parseEther("0.1"), 1)
      ).to.be.revertedWith("Existing transaction");
    });

    it("Should fail if wrong signature", async () => {
      await expect(
        redeem(owner.address, ethers.utils.parseUnits("0.1", "ether"), 1)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should fail if not admin try send the validator address", async () => {
      await expect(
        bscBridge.connect(acc1).setValidator(backend.address)
      ).to.be.revertedWith("Not admin");
    });
  });

  describe('Include, exclude and change token', () => {
    /**
     * TODO: 
     *  Сделать вот эти тесты
     *  Добавить проверки на допустимый для отправки токен в swap
     *  */ 
    it("Should include token" async () => {
      await ethBridge.includeToken(bscToken.address);
      expect(await ethBridge.availableTokensForSwap(bscToken.address)).to.equal(true);
    })
    it("Should exclude token" async () => {
      await ethBridge.includeToken(bscToken.address);
      await ethBridge.;
      expect(await ethBridge.availableTokensForSwap(bscToken.address)).to.equal(true);
    })
    it("Should change token", async () => {
      await ethBridge.
    })
   })
});
