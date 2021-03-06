//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IERC20.sol";

contract ERC20 is AccessControl, IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowed;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint256 private _decimals;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    modifier notZeroAddress(address addr) {
        require(addr != address(0), "Zero address");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 decimals
    ) {
        _name = name;
        _symbol = symbol;
        _decimals = decimals;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);

        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BURNER_ROLE, ADMIN_ROLE);
    }

    // View functions
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address owner) public view override returns (uint256) {
        return _balances[owner];
    }

    function allowance(address owner, address spender)
        public
        view
        override
        returns (uint256)
    {
        return _allowed[owner][spender];
    }

    function decimals() public view override returns (uint256) {
        return _decimals;
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function setMinterAndBurnerRoles(address addr) public {
        grantRole(MINTER_ROLE, addr);
        grantRole(BURNER_ROLE, addr);
    }

    function transfer(address to, uint256 amount)
        public
        override
        notZeroAddress(to)
        returns (bool)
    {
        require(amount <= _balances[msg.sender], "Not enough tokens");

        _balances[msg.sender] -= amount;
        _balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override notZeroAddress(to) returns (bool) {
        require(amount <= _balances[from], "Not enough tokens");
        require(
            amount <= _allowed[from][msg.sender],
            "Cannot transfer such tokens amount or you cannot spend tokens of this owner"
        );

        _balances[from] -= amount;
        _balances[to] += amount;
        _allowed[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        public
        override
        notZeroAddress(spender)
        returns (bool)
    {
        _allowed[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue)
        public
        override
        notZeroAddress(spender)
        returns (bool)
    {
        _allowed[msg.sender][spender] += addedValue;
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtracredValue)
        public
        override
        notZeroAddress(spender)
        returns (bool)
    {
        require(
            subtracredValue <= _allowed[msg.sender][spender],
            "Allowed value to spend less then 0"
        );

        _allowed[msg.sender][spender] -= subtracredValue;
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    function mint(address owner, uint256 amount)
        public
        override
        notZeroAddress(owner)
    {
        require(hasRole(MINTER_ROLE, msg.sender), "You are not owner");
        _balances[owner] += amount;
        _totalSupply += amount;

        emit Transfer(address(0), owner, amount);
    }

    function burn(address owner, uint256 amount)
        public
        override
        notZeroAddress(owner)
    {
        require(hasRole(BURNER_ROLE, msg.sender), "You are not owner");
        require(
            amount <= _balances[owner],
            "There is no such amount of tokens"
        );

        _balances[owner] -= amount;
        _totalSupply -= amount;

        emit Transfer(owner, address(0), amount);
    }
}
