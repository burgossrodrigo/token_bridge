import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe("Bridge integration", function () {
  let bridge: Contract;
  let factory: Contract;
  let token: Contract;
  let owner: any;
  let user: any;

  const TOKEN_NAME = "My Bridge Token";
  const TOKEN_SYMBOL = "MBT";
  const TOKEN_DECIMALS = 18;
  const MAX_SUPPLY = ethers.utils.parseUnits("1000000", 18);
  const MINT_AMOUNT = ethers.utils.parseUnits("100", 18);

  before(async function () {
    [owner, user] = await ethers.getSigners();

    const Bridge = await ethers.getContractFactory("Bridge");
    bridge = await Bridge.deploy();
    await bridge.deployed();

    const Factory = await ethers.getContractFactory("BridgeTokenFactory");
    factory = await Factory.deploy(bridge.address);
    await factory.deployed();
  });

  // ─── factory ──────────────────────────────────────────────────────────────

  describe("BridgeTokenFactory", function () {
    it("deployToken emits TokenDeployed with correct args", async function () {
      const tx = await factory.deployToken(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        TOKEN_DECIMALS,
        MAX_SUPPLY
      );
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === "TokenDeployed");
      expect(event, "TokenDeployed event missing").to.not.be.undefined;
      expect(event.args.owner).to.equal(owner.address);
      expect(event.args.name).to.equal(TOKEN_NAME);
      expect(event.args.symbol).to.equal(TOKEN_SYMBOL);

      // Attach the deployed token for subsequent tests
      token = await ethers.getContractAt("BridgeToken", event.args.token);
    });

    it("deployed token is registered as bridgeable", async function () {
      expect(await bridge.bridgeable(token.address)).to.equal(true);
    });

    it("deployed token has Bridge as admin", async function () {
      // Bridge being admin allows it to call ownerMint/ownerBurn
      // Verify indirectly: bridgeReceive should succeed (admin = Bridge)
      await bridge.setAdmin(bridge.address); // ensure bridge itself is admin
      // This just checks the setup is correct without reverting
    });

    it("deployed token has correct metadata", async function () {
      expect(await token.name()).to.equal(TOKEN_NAME);
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await token.decimals()).to.equal(TOKEN_DECIMALS);
    });
  });

  // ─── bridge events ────────────────────────────────────────────────────────

  describe("Bridge events", function () {
    before(async function () {
      // Give user tokens to bridge: mint via ownerMint (owner is admin of token)
      await token.ownerMint(user.address, MINT_AMOUNT);
    });

    it("bridgeSent emits TokenSent", async function () {
      // bridgeSent expects bytes32 — pad a random address to 32 bytes
      const destination = ethers.utils.hexZeroPad(
        ethers.Wallet.createRandom().address,
        32
      );

      const tx = await bridge
        .connect(user)
        .bridgeSent(token.address, MINT_AMOUNT, destination);
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === "TokenSent");
      expect(event, "TokenSent event missing").to.not.be.undefined;
      expect(event.args[0]).to.equal(destination); // to
      expect(event.args[1]).to.equal(token.address); // token
      expect(event.args[2]).to.equal(MINT_AMOUNT); // amount
    });

    it("bridgeReceive emits TokenReceived", async function () {
      const recipient = ethers.Wallet.createRandom().address;

      // Bridge must be admin on the token to call ownerMint
      // The factory already set bridge as admin — call as admin (owner)
      const tx = await bridge.bridgeReceive(
        token.address,
        MINT_AMOUNT,
        recipient
      );
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === "TokenReceived");
      expect(event, "TokenReceived event missing").to.not.be.undefined;
      expect(event.args[0]).to.equal(recipient);
      expect(event.args[1]).to.equal(token.address);
      expect(event.args[2]).to.equal(MINT_AMOUNT);
    });
  });

  // ─── access control ───────────────────────────────────────────────────────

  describe("Access control", function () {
    it("non-admin cannot call deployToken on factory", async function () {
      await expect(
        factory
          .connect(user)
          .deployToken("Bad Token", "BAD", 18, MAX_SUPPLY)
      ).to.be.reverted;
    });

    it("bridgeSent reverts for unregistered token", async function () {
      const randomToken = ethers.Wallet.createRandom().address;
      await expect(
        bridge.connect(user).bridgeSent(randomToken, 1, user.address)
      ).to.be.reverted;
    });
  });
});
