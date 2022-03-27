//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Bridge is AccessControl {
    event SwapInitialized(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 chainFrom,
        uint256 chainTo,
        string symbol,
        uint256 nonce
    );
    mapping(bytes32 => bool) public transactionsHash;
    ERC20 public token;
    address private validator;
    uint256 private _chainId;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor(ERC20 _token) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        token = _token;
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        _chainId = chainId;
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Bridge: not admin");
        _;
    }

    function changeToken(ERC20 _newToken) public onlyAdmin {
        token = _newToken;
    }

    function setValidator(address _validator) public onlyAdmin {
        validator = _validator;
    }

    function getMsgHash(
        address recipient,
        uint256 amount,
        uint256 chainTo,
        string memory symbol,
        uint256 nonce
    ) internal returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    recipient,
                    amount,
                    _chainId,
                    chainTo,
                    symbol,
                    nonce
                )
            );
    }

    function swap(
        address recipient,
        uint256 amount,
        uint256 chainTo,
        string memory symbol,
        uint256 nonce
    ) public {
        token.burn(msg.sender, amount);
        emit SwapInitialized(
            msg.sender,
            recipient,
            amount,
            _chainId,
            chainTo,
            symbol,
            nonce
        );
    }

    function getEthMsgHash(bytes32 _msgHash) internal pure returns (bytes32) {
        string memory prefix = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefix, _msgHash));
    }

    /**
        @notice Calls this function to receive sended tokens from chain with "chainFrom" id to chain with "chainTo" id
        @dev We need to create message using "\x19Ethereum Signed Message:\n32"
        @param recipient Address that receive tokens from chain with "chainFrom" id
        @param amount Amount of receiving tokens
        @param chainTo Chain id to wich tokens are sent
        @param symbol Symbol of sended tokens
        @param nonce Some number from creating message hash
        @param v Recovery id 
        @param r Output of the ECDSA signature
        @param s Output of the ECDSA signature
     */
    function redeem(
        address recipient,
        uint256 amount,
        uint256 chainTo,
        string memory symbol,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        require(msg.sender == recipient, "Not recipient");
        bytes32 msgHash = getMsgHash(recipient, amount, chainTo, symbol, nonce);
        require(!transactionsHash[msgHash], "Bridge: existing transaction");
        bytes32 ethMsgHash = getEthMsgHash(msgHash);
        require(checkSign(ethMsgHash, v, r, s), "Bridge: invalid signature");
        transactionsHash[msgHash] = true;
        token.mint(recipient, amount);
    }

    /**
        @notice Checks that signer of the message is validator
        @dev Recover the signer of the message using ecrecover
        @param ethMsgHash Ethereum signed message
        @param v Recovery id 
        @param r Output of the ECDSA signature
        @param s Output of the ECDSA signature
     */
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
