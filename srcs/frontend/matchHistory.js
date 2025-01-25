import { DOM } from "./dom.js";

export async function loadMatchHistory() {
    try {
        let user_id = localStorage.getItem('user_id');
        const response = await fetch("/api/api/accounts/matches/" + user_id + "/", {
            method: 'GET',
            credentials: 'include',
            });
            
        const data = await response.json();
        if (data) {
            console.log("Fetch matches: ", data);
        }
    } catch (error) {
		console.error('Error during Polling:', error);
	}
}

function addMatchHistoryRow(matchId, opponent, result, date) {
    const tableBody = DOM.matchHistoryTable.querySelector('tbody');
    const newRow = document.createElement('tr');

    newRow.innerHTML = `
        <td>${matchId}</td>
        <td>${opponent}</td>
        <td>${result}</td>
        <td>${date}</td>
    `;

    tableBody.appendChild(newRow);
}
