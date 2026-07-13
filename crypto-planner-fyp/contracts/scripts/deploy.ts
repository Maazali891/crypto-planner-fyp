import { ethers } from "hardhat";

async function main() {
  console.log("Deploying InterestVault contract...");

  const InterestVault = await ethers.getContractFactory("InterestVault");
  const vault = await InterestVault.deploy();

  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log(`✅ InterestVault deployed to: ${address}`);
  console.log("");
  console.log("Add this to your .env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
