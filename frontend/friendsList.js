import { DOM } from "./dom.js";

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
            console.log("Friends List:", data.friends);
            populateFriendsList(data.friends);
        } else {
            console.error("Failed to fetch friends list:", response.status);
        }
    } catch (error) {
        console.error('Error during Polling:', error);
    }
}

function populateFriendsList(friends) {
    const friendsListElement = document.getElementById('friends-list');
    friendsListElement.innerHTML = ''; // Clear existing list

    if (friends.length === 0) {
        const noFriendsItem = document.createElement('li');
        noFriendsItem.className = 'list-group-item text-center';
        noFriendsItem.textContent = 'No friends found.';
        friendsListElement.appendChild(noFriendsItem);
        return;
    }

    friends.forEach(friend => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';

        const friendName = document.createElement('span');
        friendName.textContent = friend.username;

        const statusBadge = document.createElement('span');
        statusBadge.className = `badge rounded-pill ${friend.is_active ? 'bg-primary' : 'bg-secondary'}`;
        statusBadge.textContent = friend.is_authenticated ? 'Online' : 'Offline';

        listItem.appendChild(friendName);
        listItem.appendChild(statusBadge);
        friendsListElement.appendChild(listItem);
    });
}
