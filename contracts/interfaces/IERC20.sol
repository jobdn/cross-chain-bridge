// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IERC20 {
    event Approval(address indexed from, address indexed to, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);

    function approve(address spender, uint256 amount) external returns (bool);

    function transfer(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function mint(address owner, uint256 amount) external;

    function burn(address owner, uint256 amount) external;

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function decreaseAllowance(address spender, uint256 subtracredValue)
        external
        returns (bool);

    function increaseAllowance(address spender, uint256 subtracredValue)
        external
        returns (bool);

    function balanceOf(address owner) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint256);
}
