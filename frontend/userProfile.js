export async function updateUserInfo() {
    const token = localStorage.getItem('access_token');
    const updatedProfile = {
        email: document.getElementById('profileEmail').value.trim(),
        first_name: document.getElementById('profileFirstName').value.trim(),
        last_name: document.getElementById('profileLastName').value.trim(),
    };

    try {
        const response = await fetch('/api/accounts/user/', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedProfile),
        });

        if (response.ok) {
            const data = await response.json();
            alert('Profile updated successfully!');
            loadUserInfo(); // Reload the profile to reflect updated data
        } else {
            const errorData = await response.json();
            console.error('Failed to update profile:', errorData);
            alert('Failed to update profile. Please try again.');
        }
    } catch (error) {
        console.error('Error during profile update:', error);
        alert('An unexpected error occurred. Please try again.');
    }
}

// export async function loadUserInfo() {
//     const token = localStorage.getItem('access_token');

//     try {
//         const response = await fetch('/api/accounts/user/', {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//             },
//         });

//         if (response.ok) {
//             const data = await response.json();
//             document.getElementById('profileUsername').textContent = data.username;
//             document.getElementById('profileEmail').textContent = data.email;
//             document.getElementById('profileFirstName').textContent = data.first_name;
//             document.getElementById('profileLastName').textContent = data.last_name;
//             console.log("Avatar URL:", data.avatar_url);
//             document.getElementById('profileAvatar').src = data.avatar_url;
//         } else {
//             console.error('Failed to load user info:', response.status);
//         }
//     } catch (error) {
//         console.error('Error fetching user info:', error);
//     }
// }

export async function loadUserInfo() {
    const token = localStorage.getItem('access_token');
    
    try {
        console.log("Fetching user info...");
        const response = await fetch('/api/accounts/user/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        console.log("Response status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log("Raw API Response:", data);  // ✅ Log full API response
            console.log("User data received:", data);
            console.log("Wins:", data.wins, "Losses:", data.losses);  // ✅ Log extracted values
            // Debug DOM elements before updating
            console.log("profileUsername:", document.getElementById('profileUsername'));
            console.log("profileEmail:", document.getElementById('profileEmail'));
            console.log("profileFirstName:", document.getElementById('profileFirstName'));
            console.log("profileLastName:", document.getElementById('profileLastName'));
            console.log("profileAvatar:", document.getElementById('profileAvatar'));

            // Update DOM
            document.getElementById('profileUsername').textContent = data.username;
            document.getElementById('profileEmail').textContent = data.email;
            document.getElementById('profileFirstName').textContent = data.first_name || "N/A";
            document.getElementById('profileLastName').textContent = data.last_name || "N/A";

            document.getElementById('profileWins').textContent = data.wins ?? "0";
            document.getElementById('profileLosses').textContent = data.losses ?? "0";

            console.log("Avatar URL:", data.avatar_url);
            document.getElementById('profileAvatar').src = data.avatar_url;
        } else {
            console.error('Failed to load user info:', response.status);
            const errorData = await response.json();
            console.error("Error details:", errorData);
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}
