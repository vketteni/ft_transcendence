const PongScores = artifacts.require("PongScores");

contract("PongScores", (accounts) => {
    it("should add and retrieve scores", async () => {
        const instance = await PongScores.deployed();
        await instance.addScore("Player1", 100);
        const scores = await instance.getScores();
        assert.equal(scores[0].playerName, "Player1");
        assert.equal(scores[0].score, 100);
    });
});

