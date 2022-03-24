# Cross chain bridge

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
npx hardhat run scripts/deploy.ts --network rinkeby
```

To deploy contract in BSC network run:
```shell
npx hardhat run scripts/deploy.ts --network bcs
```
## Task performing

Before performing tasks, add address of the bridges in the Ethereum network and BSC network to the `config.ts` file.