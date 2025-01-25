

export async function loadFriends() {
    try {
        let user_id = localStorage.getItem('user_id');
        const response = await fetch(`api/accounts/friends/?user_id=${user_id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
                'Content-Type': 'application/json',
            },
        });
    
        if (response.ok) {
            const data = await response.json();
            console.log("Friends:", data.matches);
            if (data.matches && data.matches.length > 0) {
                // populateMatchHistory(data.matches);
            } else {
                console.log("No friends found.");
            }
        } else {
            console.error("Failed to fetch friends:", response.status);
        }
    } catch (error) {
        console.error('Error during Polling:', error);
    }

}






















// export async function loadMatchHistory() {
// }

// function populateMatchHistory(matches) {
//     // Clear existing rows
//     const tableBody = DOM.matchHistoryTable.querySelector('tbody');
//     tableBody.innerHTML = ''; // Remove existing rows

//     let username = localStorage.getItem('username'); 
//     let user_id = localStorage.getItem('user_id'); 

//     matches.forEach((match) => {
//         const matchId = match.id;
//         const opponent = match.player1_username === username
//             ? match.player2_username
//             : match.player1_username;
//         const result = match.winner_username === match.player1_username ? 'Win' : 'Loss';
//         const date = new Date(match.date_played).toLocaleDateString(); // Format date

//         addMatchHistoryRow(matchId, opponent, result, date);
//     });
// }



// function addMatchHistoryRow(matchId, opponent, result, date) {
//     const tableBody = DOM.matchHistoryTable.querySelector('tbody');
//     const newRow = document.createElement('tr');

//     newRow.innerHTML = `
//         <td>${matchId}</td>
//         <td>${opponent}</td>
//         <td>${result}</td>
//         <td>${date}</td>
//     `;

//     tableBody.appendChild(newRow);
// }
