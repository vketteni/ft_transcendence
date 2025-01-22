export const DOM = {
    // Top bar
    topBar: document.getElementById('topbar'),
    topBarNav: document.getElementById('topbar-nav'),
    topBarLogo: document.getElementById('logo'),
	navNav: document.getElementById("naver"),

    // game canvas
    canvas: document.getElementById('canvas'),
    ctx: document.getElementById('canvas').getContext('2d'),

    // screens
    gameScreen: document.getElementById('game-screen'),

    // registrationScreen: document.getElementById('registration-screen'),
    loginScreen: document.getElementById('login-screen'),
    signupScreen: document.getElementById('signup-screen'),
    categoryScreen: document.getElementById('category-screen'),
    matchmakingScreen: document.getElementById('matchmaking-screen'),
    AIwaitingScreen: document.getElementById('ai-waiting-screen'),
	twoPGwaitingScreen: document.getElementById('2PG-waiting-screen'), 

	twoPGTimer: document.getElementById('2PGtimerDisplay'),
    AItimer: document.getElementById('AItimerDisplay'),
    matchmakingTimer: document.getElementById('timerDisplay'),
    userprofileScreen: document.getElementById('userprofile-screen'),
    
    // login/signup screen
    loginButton: document.getElementById('login-button'),
    
    
    // registrationButton
    registrationButton: document.getElementById('registration-button'),
    
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    
    // login form
    loginAlias: document.getElementById('login-alias'),
    loginPassword: document.getElementById('login-password'),
    login42Button: document.getElementById('login-42-button'),
	loginExitButton: document.getElementById('login-exit'),
    
    // sing up form
    signupAlias: document.getElementById('signup-alias'),
    signupPassword: document.getElementById('signup-password'),
    signupEmail: document.getElementById('signup-email'),
	signupExitButton: document.getElementById('signup-exit'),
    
    // Category screen buttons  
	twoPGButton: document.getElementById('2PG'),
    PvPButton: document.getElementById('PvP'),
    PvCButton: document.getElementById('PvC'),
    tournamentButton: document.getElementById('Tournament'),

    // User profile screen
    editProfileButton: document.getElementById('editProfileButton'),
    cancelEditButton: document.getElementById('cancelEditButton'),
    profileButton: document.getElementById('profileButton'),
	profileExitButton: document.getElementById('profile-exit'),

    // Edit user profile screen
    editProfileForm: document.getElementById('editProfileForm'),
    editUsername: document.getElementById('editUsername'),
    editEmail: document.getElementById('editEmail'),
    editFirstName: document.getElementById('editFirstName'),
    editLastName: document.getElementById('editLastName'),

    profileView: document.getElementById('profileView'),
    profileEdit: document.getElementById('profileEdit'),

    profileUsername: document.getElementById('profileUsername'),
    profileEmail: document.getElementById('profileEmail'),
    profileFirstName: document.getElementById('profileFirstName'),
    profileLastName: document.getElementById('profileLastName'),
    
    // Game screen
    pauseButton: document.getElementById('pause-button'),
	exitButton: document.getElementById('game-exit'),

	//Matchmaking screen
	// matchmakingExitButton: document.getElementById('matchmaking-exit'),
    
    // AI Game over screen
    AIgameOverScreen: document.getElementById('ai-game-over-screen'),
    AIgameOverMessage: document.getElementById('ai-game-over-message'),
    AIplayAgainButton: document.getElementById('ai-play-again-button'),
    AIbackToMenuButton: document.getElementById('ai-back-to-menu'),

    // PVP Game over screen
    PvPgameOverScreen: document.getElementById('pvp-game-over-screen'),
    PvPgameOverMessage: document.getElementById('pvp-game-over-message'),
    PvPplayAgainButton: document.getElementById('pvp-play-again-button'),
    PvPbackToMenuButton: document.getElementById('pvp-back-to-menu'),

	//2PG
    twoPGgameOverScreen: document.getElementById('2PG-game-over-screen'),
    twoPGgameOverMessage: document.getElementById('2PG-game-over-message'),
    twoPGplayAgainButton: document.getElementById('2PG-play-again-button'),
    twoPGbackToMenuButton: document.getElementById('2PG-back-to-menu'),

    logoutButton: document.getElementById('logout-button'),
};


