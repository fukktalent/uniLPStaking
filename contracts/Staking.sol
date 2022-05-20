//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IERC20.sol";

/// @title staking contract for stake uniswap v2 lp tokens
/// @dev reward calculates every rewardPeriod and depends on rewardPercent and lpAmount per period
contract Staking {
    struct Stake {
        uint256 lpAmount;
        uint256 rewardAmount;
        uint256 startTime;
    }

    IUniswapV2Pair tokenPair;
    IERC20 rewardToken;

    mapping(address => Stake) private _stakes;

    address public owner;

    uint256 public freezePeriod = 30 * 60;
    uint256 public rewardPeriod = 10 * 60;
    uint256 public rewardPercent = 15;

    event Staked(address from, uint256 amount);
    event Unstaked(address to, uint256 amount);
    event Claimed(address to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner allowed");
        _;
    }

    constructor(IUniswapV2Pair tokenPair_, IERC20 rewardToken_) {
        owner = msg.sender;
        tokenPair = tokenPair_;
        rewardToken = rewardToken_;
    }

    function stake(uint256 amount) public {
        require(
            tokenPair.balanceOf(msg.sender) >= amount,
            "not enough balance"
        );
        require(
            tokenPair.allowance(msg.sender, address(this)) >= amount,
            "not enough allowed"
        );

        if (_stakes[msg.sender].lpAmount > 0) {
            _stakes[msg.sender].rewardAmount += _calcReward(msg.sender);
            _stakes[msg.sender].lpAmount += amount;
        } else {
            _stakes[msg.sender].lpAmount = amount;
        }

        _stakes[msg.sender].startTime = block.timestamp;
        tokenPair.transferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function unstake() public {
        require(
            block.timestamp > _stakes[msg.sender].startTime + freezePeriod,
            "tokens still freezed"
        );

        _stakes[msg.sender].rewardAmount += _calcReward(msg.sender);
        uint256 lpAmount = _stakes[msg.sender].lpAmount;
        _stakes[msg.sender].lpAmount = 0;
        tokenPair.transfer(msg.sender, lpAmount);

        emit Unstaked(msg.sender, lpAmount);
    }

    function claim() public {
        uint256 rewardAmount = _stakes[msg.sender].rewardAmount + _calcReward(msg.sender);
        require(rewardAmount > 0, "nothing to claim");

        _stakes[msg.sender].rewardAmount = 0;
        _stakes[msg.sender].startTime = block.timestamp;
        rewardToken.transfer(msg.sender, rewardAmount);

        emit Claimed(msg.sender, rewardAmount);
    }

    function setFreezePeriod(uint256 freezePeriod_) public onlyOwner {
        freezePeriod = freezePeriod_;
    }

    function setRewardPeriod(uint256 rewardPeriod_) public onlyOwner {
        rewardPeriod = rewardPeriod_;
    }

    function setRewardPercent(uint256 rewardPercent_) public onlyOwner {
        rewardPercent = rewardPercent_;
    }

    function getStakeData()
        public
        view
        returns (
            uint256 lpAmount,
            uint256 rewardAmount,
            uint256 startTime
        )
    {
        return (
            _stakes[msg.sender].lpAmount,
            _stakes[msg.sender].rewardAmount,
            _stakes[msg.sender].startTime
        );
    }

    function _calcReward(address addr) private view returns (uint256) {
        uint256 rewardPeriodsCount = (block.timestamp - _stakes[addr].startTime) / rewardPeriod;
        return (rewardPeriodsCount * _stakes[addr].lpAmount * rewardPercent) / 100;
    }
}
