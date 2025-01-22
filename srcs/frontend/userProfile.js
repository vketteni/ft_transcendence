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

export async function loadUserInfo() {
    const token = localStorage.getItem('access_token');

    try {
        const response = await fetch('/api/accounts/user/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('profileUsername').textContent = data.username;
            document.getElementById('profileEmail').textContent = data.email;
            document.getElementById('profileFirstName').textContent = data.first_name;
            document.getElementById('profileLastName').textContent = data.last_name;
        
            document.getElementById('profileWins').textContent = data.wins ?? "0";
            document.getElementById('profileLosses').textContent = data.losses ?? "0";
        } else {
            console.error('Failed to load user info:', response.status);
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}