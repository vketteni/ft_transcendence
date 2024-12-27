const TournamentScores = artifacts.require("TournamentScores");

module.exports = function (deployer) {
    deployer.deploy(TournamentScores);
};
