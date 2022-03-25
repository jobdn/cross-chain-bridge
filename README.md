# Cross chain bridge

See `config.ts` to check address of the bridges and tokens

## Before running

1. Add address of the bridges in the Ethereum network and BSC network to the `config.ts` file.
2. Also you need to call the `setValidator` funciton to set address of validator. This address will send you signature to call `redeem` function.
3. Also you need to add the MINTER and BUTNER role to the bridge in ERC20 contract to mint and burn tokens. To do it call the `setMinterAndBurnerRoles` funtion of the ERC20.

## Test usign hardhat-gas-reporter plugin

```shell
REPORT_GAS=true npx hardhat test
```

## Test usign solidity-coverage plugin

```shell
npx hardhat coverage
```

## Contract deploying

To deploy contract in Ethereum network run:

```shell
npx hardhat run scripts/bridge-deploy.ts --network rinkeby
```

To deploy contract in BSC network run:

```shell
npx hardhat run scripts/bridge-deploy.ts --network bcs
```
