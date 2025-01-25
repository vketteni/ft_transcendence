export const DOM = {
    // Top bar
    topBar: document.getElementById('topbar'),
    topBarNav: document.getElementById('topbar-nav'),
    topBarLogo: document.getElementById('logo'),

    // game canvas
    canvas: document.getElementById('canvas'),
    ctx: document.getElementById('canvas').getContext('2d'),

    // screens
    gameScreen: document.getElementById('game-screen'),
	AIgameOverScreen: document.getElementById('ai-game-over-screen'),
	PvPgameOverScreen: document.getElementById('pvp-game-over-screen'),
	twoPGgameOverScreen: document.getElementById('2PG-game-over-screen'),

    loginScreen: document.getElementById('login-screen'),
    signupScreen: document.getElementById('signup-screen'),
    categoryScreen: document.getElementById('category-screen'),

	userprofileScreen: document.getElementById('userprofile-screen'),
	tournamentScreen: document.getElementById('tournament-screen'),

    
	
	//waiting screens
    AIwaitingScreen: document.getElementById('ai-waiting-screen'),
	twoPGwaitingScreen: document.getElementById('2PG-waiting-screen'), 
	matchmakingScreen: document.getElementById('matchmaking-screen'),
	
	//timers
	twoPGTimer: document.getElementById('2PGtimerDisplay'),
    AItimer: document.getElementById('AItimerDisplay'),
    matchmakingTimer: document.getElementById('timerDisplay'),
	    
    // login/signup
	loginButton: document.getElementById('login-button'),
    signupButton: document.getElementById('signup-button'),
    
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
    signupAvatar: document.getElementById('signup-avatar'),
	signupExitButton: document.getElementById('signup-exit'),
    
    // Category screen buttons  
	twoPGButton: document.getElementById('2PG'),
    PvPButton: document.getElementById('PvP'),
    PvCButton: document.getElementById('PvC'),
    tournamentButton: document.getElementById('tournament-button'),

    // User profile screen
    editProfileButton: document.getElementById('editProfileButton'),
    cancelEditButton: document.getElementById('cancelEditButton'),
    profileButton: document.getElementById('profileButton'),
	profileExitButton: document.getElementById('profile-exit'),
    FriendsPageButton: document.getElementById('FriendsPageButton'),
    MatchHistoryButton: document.getElementById('MatchHistoryButton'),
    
    // Edit user profile screen
    editProfileForm: document.getElementById('editProfileForm'),
    editUsername: document.getElementById('editUsername'),
    editEmail: document.getElementById('editEmail'),
    editFirstName: document.getElementById('editFirstName'),
    editLastName: document.getElementById('editLastName'),
    editAvatar: document.getElementById('editAvatar'),

    profileView: document.getElementById('profileView'),
    profileEdit: document.getElementById('profileEdit'),

    profileUsername: document.getElementById('profileUsername'),
    profileEmail: document.getElementById('profileEmail'),
    profileFirstName: document.getElementById('profileFirstName'),
    profileLastName: document.getElementById('profileLastName'),
    profileAvatar: document.getElementById('profileAvatar'),
    
    // Game buttons
    pauseButton: document.getElementById('pause-button'),
	exitButton: document.getElementById('game-exit'),
    
    // AI Game over screen
    AIgameOverMessage: document.getElementById('ai-game-over-message'),
    AIplayAgainButton: document.getElementById('ai-play-again-button'),
    AIbackToMenuButton: document.getElementById('ai-back-to-menu'),

    // PVP Game over screen
    PvPgameOverMessage: document.getElementById('pvp-game-over-message'),
    PvPplayAgainButton: document.getElementById('pvp-play-again-button'),
    PvPbackToMenuButton: document.getElementById('pvp-back-to-menu'),
	PvPaddFriendButton: document.getElementById('pvp-add-friend'),
	
	// TRNMT Game Over Screen
	TRNMTgameOverScreen: document.getElementById('trnmt-game-over-screen'),
	TRNMTgameOverMessage: document.getElementById('trnmt-game-over-message'),
	TRNMTgoToNextGameButton: document.getElementById('trnmt-go-to-next-game-button'),
	TRNMTbackToMenuButton: document.getElementById('trnmt-back-to-menu'),

	//2PG
    twoPGgameOverMessage: document.getElementById('2PG-game-over-message'),
    twoPGplayAgainButton: document.getElementById('2PG-play-again-button'),
    twoPGbackToMenuButton: document.getElementById('2PG-back-to-menu'),

    logoutButton: document.getElementById('logout-button'),
	
	// accept screen
	acceptScreen: document.getElementById("accept-screen"),
	acceptButton: document.getElementById('accept-button'),
	rejectButton: document.getElementById('reject-button'),
	acceptText: document.getElementById('accept-text'),



    
    // Match history screen
    matchHistoryScreen: document.getElementById('match-history-screen'),
    matchHistoryTable: document.getElementById('match-history-table'),
    
    // Friends screen
    friendScreen: document.getElementById('friends-screen'),
    friendList: document.getElementById('friends-list'),
    
};


