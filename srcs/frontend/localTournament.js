import { localState } from "./state.js";
import { showScreen } from "./showScreen.js";


export let localTournament = {
    players: [],
    matches: [],
    currentMatchIndex: 0,
};

export function startTournamentMatch() {
    const match = localTournament.matches[localTournament.currentMatchIndex];

    if (!match) {
        console.error("No more matches available!");
        return;
    }

    localState.paddles.left.name = match[0];
    localState.paddles.right.name = match[1];
    localState.paddles.left.score = 0;
    localState.paddles.right.score = 0;
    localState.gameStarted = true;
	console.log("Local match started");
    showScreen("game-screen");

    console.log(`Starting Match: ${match[0]} vs ${match[1]}`);
}

export function checkTournamentProgress() {
    if (localTournament.currentMatchIndex >= localTournament.matches.length) {
        console.error("Invalid match index!");
        return;
    }

    const match = localTournament.matches[localTournament.currentMatchIndex];
    const winner = (localState.paddles.left.score >= 10) ? match[0] : match[1];

    console.log(`Winner of Match ${localTournament.currentMatchIndex + 1}: ${winner}`);

    if (localTournament.currentMatchIndex === 1) {
        // Final match
        console.log(`Tournament Winner: ${winner}`);
        showWinnerScreen(winner);
    } else {
        // Store winner and set up final match
        localTournament.matches.push([winner, "TBD"]); // TBD will be replaced later
        localTournament.currentMatchIndex++;
        startTournamentMatch();
    }
}
