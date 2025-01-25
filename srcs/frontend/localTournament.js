import { localState, resetLocalState } from "./state.js";
import { showScreen } from "./showScreen.js";

export let localTournament = {
    players: [],
    matches: [],
    winners: [], 
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

    showScreen("game-screen");
}

export function checkTournamentProgress() {
    const match = localTournament.matches[localTournament.currentMatchIndex];
    if (!match) {
        console.error("Invalid match index!");
        return;
    }

    const winner = localState.paddles.left.score >= 10 ? match[0] : match[1];
    console.log(`Winner of Match ${localTournament.currentMatchIndex + 1}: ${winner}`);

    localTournament.winners.push(winner);
    localTournament.currentMatchIndex++;

    resetLocalState();

    if (localTournament.currentMatchIndex === 1) {
        // Show Intermediate Game Over Screen
        DOM.ltIntGameoverMessage.textContent = `Next Match: ${localTournament.winners[0]} vs ${localTournament.winners[1]}`;
        showScreen("lt-intermediate-game-over-screen");
    } else if (localTournament.currentMatchIndex === 2) {
        // Tournament finished → Show final winner
        const tournamentWinner = localTournament.winners[2];
        DOM.ltGameOverMessage.textContent = `${tournamentWinner} Wins the Tournament!`;
        showScreen("lt-game-over-screen");
    } else {
        // Prepare final match between winners
        localTournament.matches.push([localTournament.winners[0], localTournament.winners[1]]);
        startTournamentMatch();
    }
}
