//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Bridge is AccessControl {
    // TODO: make private this variables
    event SwapInitialized(
        address indexed sender,
        address indexed recepient,
        uint256 amount,
        uint256 nonce
    );
    mapping(bytes32 => bool) public transactionsHash;
    ERC20 token;
    address private validator;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setValidator(address _validator) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not admin");
        validator = _validator;
    }

    function getMsgHash(
        address recepient,
        uint256 amount,
        uint256 chainFrom,
        uint256 chainTo,
        string memory symbol,
        uint256 nonce
    ) internal returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    recepient,
                    amount,
                    chainFrom,
                    chainTo,
                    symbol,
                    nonce
                )
            );
    }

    function swap(
        address recepient,
        uint256 amount,
        uint256 chainFrom,
        uint256 chainTo,
        string memory symbol,
        uint256 nonce
    ) public {
        // Сжигает токены
        bytes32 msgHash = getMsgHash(
            recepient,
            amount,
            chainFrom,
            chainTo,
            symbol,
            nonce
        );
        require(!transactionsHash[msgHash], "Existing transaction");
        // Вносить хеш из параметров в мапу, вот тут и нужен nonce
        transactionsHash[msgHash] = true;
        token.burn(msg.sender, amount);
        // Отправляем ивент
        emit SwapInitialized(msg.sender, recepient, amount, nonce);
    }

    function getEthMsgHash(bytes32 _msgHash) public pure returns (bytes32) {
        string memory prefixer = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefixer, _msgHash));
    }

    function redeem(
        address owner,
        address recepient,
        uint256 amount,
        uint256 chainFrom,
        uint256 chainTo,
        string memory symbol,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s 
        // bytes calldata signature
    ) public {
        bytes32 msgHash = getMsgHash(
            recepient,
            amount,
            chainFrom,
            chainTo,
            symbol,
            nonce
        );
        require(!transactionsHash[msgHash], "Existing transaction");
        bytes32 ethMsgHash = getEthMsgHash(msgHash);
        require(checkSign(ethMsgHash, v, r, s), "Not valid signature");

        transactionsHash[msgHash] = true;
        token.mint(owner, amount);
    }

    function checkSign(
        bytes32 ethMsgHash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public returns (bool) {
        address signerAddress = ecrecover(ethMsgHash, v, r, s);
        return signerAddress == validator;
    }
}
