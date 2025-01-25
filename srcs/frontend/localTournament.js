import { localState, resetLocalState } from "./state.js";
import { showScreen } from "./showScreen.js";
import { DOM } from "./dom.js";

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
        // **First 2 matches finished → Show Intermediate Game Over Screen**
        console.log("Match 1 finished");
        DOM.ltIntGameoverMessage.innerHTML = `First round is over. <strong>${localTournament.winners[0]}</strong> wins!<br>Next Match: ${localTournament.players[2]} vs ${localTournament.players[3]}`;
        showScreen("lt-intermediate-game-over-screen");
    } else if (localTournament.currentMatchIndex === 2) {
        console.log("Match 2 finished");
        // Show Intermediate Game Over Screen
        DOM.ltIntGameoverMessage.innerHTML = `Second round is over. <strong>${localTournament.winners[1]}</strong> wins!<br>Final Match: ${localTournament.winners[0]} vs ${localTournament.winners[1]}`;
        localTournament.matches[2] = [localTournament.winners[0], localTournament.winners[1]];
        showScreen("lt-intermediate-game-over-screen");
    } else if (localTournament.currentMatchIndex === 3) {
        // Tournament finished → Show final winner
        const tournamentWinner = localTournament.winners[2];
        DOM.ltGameOverMessage.innerHTML = `Tournament is over!<br><strong>${tournamentWinner}</strong> won`;
        showScreen("lt-game-over-screen");
    } else {
        // Prepare final match between winners
        localTournament.matches.push([localTournament.winners[0], localTournament.winners[1]]);
        startTournamentMatch();
    }
}
