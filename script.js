const gameNames = [
    'Super Mario 64',
    'Mario Kart 64',
    'Donkey Kong 64',
    'Super Mario Odyssey',
    'Call of Duty: Modern Warfare',
    'Modern Warfare Remastered',
    'Modern Warfare 2',
    'Modern Warfare 2 Campaign Remastered',
    'Modern Warfare 3',
    'Modern Warfare 2019',
    'Modern Warfare II',
    'Modern Warfare III'
];

// Function to add a delay (in milliseconds)
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Updated approach to handle embedding limitations in fetching player data.
// Fetch player details separately when fetching leaderboard data.
async function fetchPlayerDetails(playerUri) {
    try {
        const response = await fetch(playerUri);
        const data = await response.json();
        return data.data.names.international; // Returns player name
    } catch (error) {
        console.error('Error fetching player details:', error);
        return 'Unknown Player';
    }
}

// Helper function to fetch game ID using the exact game name
async function fetchGameId(gameName) {
    try {
        const response = await fetch(`https://www.speedrun.com/api/v1/games?name=${encodeURIComponent(gameName)}`);
        const data = await response.json();
        if (data.data.length > 0) {
            return data.data[0].id;  // Return the first matching game ID
        } else {
            console.error(`No game found for name: ${gameName}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching game ID:', error);
        return null;
    }
}

// Fetch game images and dynamically add them to game cards
async function fetchGameImages() {
    for (let i = 0; i < gameNames.length; i++) {
        const gameName = gameNames[i];
        const gameId = await fetchGameId(gameName);  // Get the game ID using the name

        if (gameId) {
            try {
                const response = await fetch(`https://www.speedrun.com/api/v1/games/${gameId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Data fetched for ${gameName}:`, data); // Log the entire response for debugging
                    console.log(`Assets for ${gameName}:`, data.data.assets); // Log the assets object to see what is available
                    const gameCoverUrl = data.data.assets['cover-medium']?.uri;

                    if (gameCoverUrl) {
                        // Create or select the image element for each game card
                        const gameCard = document.querySelectorAll('.game-card')[i];
                        if (gameCard) {
                            let imgElement = gameCard.querySelector('img');
                            if (!imgElement) {
                                imgElement = document.createElement('img');
                                imgElement.classList.add('game-cover'); // Add class for CSS styling
                                gameCard.prepend(imgElement); // Add the image element to the beginning of the game card
                            }

                            imgElement.src = gameCoverUrl; // Set the image if the fetch is successful
                            imgElement.alt = `Cover image for ${gameName}`;
                            console.log(`Successfully fetched cover for ${gameName}`);
                        }
                    } else {
                        console.error(`Cover image not found for ${gameName}`);
                    }
                } else {
                    console.error(`Error fetching game details for ${gameName}: ${response.status}`);
                }
            } catch (error) {
                console.error(`Error fetching game details for ${gameName}:`, error);
            }
        }

        // Add a delay after every 2 images to avoid overloading requests
        if ((i + 1) % 2 === 0) {
            await delay(500); // 500 ms delay between every 2 images
        }
    }
}

// Existing code for fetching leaderboard data and loading categories
async function fetchLeaderboardData(categoryId) {
    const response = await fetch(`https://www.speedrun.com/api/v1/leaderboards/o1y9wo6q/category/${categoryId}`);
    if (!response.ok) throw new Error('Error fetching leaderboard data');
    const data = await response.json();

    // Fetch each player's details separately
    const runs = await Promise.all(data.data.runs.map(async (run) => {
        const playerDetails = await fetchPlayerDetails(run.run.players[0].uri);
        return {
            ...run,
            playerName: playerDetails,
        };
    }));

    return runs;
}

async function fetchCategories() {
    const response = await fetch(`https://www.speedrun.com/api/v1/games/o1y9wo6q/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    const data = await response.json();
    return data.data;
}

document.addEventListener('DOMContentLoaded', async () => {
    const categories = await fetchCategories();
    const select = document.getElementById('categorySelect');
    categories.forEach(category => {
        if (category.name !== 'Stage RTA') {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        }
    });

    // Fetch and display game images on page load
    await fetchGameImages();

    select.addEventListener('change', async () => {
        const categoryId = select.value;
        document.getElementById('loadingMessage').style.display = 'block';
        await loadRunsOneByOne(categoryId, select.options[select.selectedIndex].textContent);
    });
});
