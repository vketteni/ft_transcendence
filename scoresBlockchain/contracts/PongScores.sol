// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PongScores {
    struct Score {
        string playerName;
        uint256 score;
        uint256 timestamp;
    }

    Score[] public scores;

    event ScoreAdded(string playerName, uint256 score, uint256 timestamp);

    function addScore(string memory playerName, uint256 score) public {
        scores.push(Score(playerName, score, block.timestamp));
        emit ScoreAdded(playerName, score, block.timestamp);
    }

    function getScores() public view returns (Score[] memory) {
        return scores;
    }
}
