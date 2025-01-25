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

	friendsScreen: document.getElementById('friends-screen'),
	userprofileScreen: document.getElementById('userprofile-screen'),
	tournamentScreen: document.getElementById('tournament-screen'),
    
	//waiting screens
    AIwaitingScreen: document.getElementById('ai-waiting-screen'),
	twoPGwaitingScreen: document.getElementById('2PG-waiting-screen'), 
	matchmakingScreen: document.getElementById('matchmaking-screen'),
	
	//timers
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
	signupExitButton: document.getElementById('signup-exit'),
    
    // Category screen buttons  
	lgButton: document.getElementById('local-game-button'),
    ltButton: document.getElementById('local-tournament-button'),
    PvPButton: document.getElementById('PvP'),
    PvCButton: document.getElementById('PvC'),
    tournamentButton: document.getElementById('tournament-button'),

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
    
    // Game buttons
    pauseButton: document.getElementById('pause-button'),
	exitButton: document.getElementById('game-exit'),

    // Local game enter aliases screen
    lgEnterAliasesScreen: document.getElementById('local-game-alias-screen'),
    lgEnterAliasesForm: document.getElementById('lg-alias-form'),
    lgPlayer1: document.getElementById('lg-player1'),
    lgPlayer2: document.getElementById('lg-player2'),

    // Local tournament enter aliases screen
    ltEnterAliasesScreen: document.getElementById('local-tournament-alias-screen'),
    ltEnterAliasesForm: document.getElementById('lt-alias-form'),
    ltPlayer1: document.getElementById('lt-player1'),
    ltPlayer2: document.getElementById('lt-player2'),
    ltPlayer3: document.getElementById('lt-player3'),
    ltPlayer4: document.getElementById('lt-player4'),
    
    // AI Game over screen
    AIgameOverMessage: document.getElementById('ai-game-over-message'),
    AIplayAgainButton: document.getElementById('ai-play-again-button'),
    AIbackToMenuButton: document.getElementById('ai-back-to-menu'),

    // PVP Game over screen
    PvPgameOverMessage: document.getElementById('pvp-game-over-message'),
    PvPplayAgainButton: document.getElementById('pvp-play-again-button'),
    PvPbackToMenuButton: document.getElementById('pvp-back-to-menu'),
	PvPaddFriendButton: document.getElementById('pvp-add-friend'),

    // Local Game over screen
    lgGameOverScreen: document.getElementById("lg-game-over-screen"),
    lgGameOverMessage: document.getElementById('lg-game-over-message'),
    lgPlayAgainButton: document.getElementById('lg-play-again-button'),
    lgToMenuButton: document.getElementById('lg-back-to-menu'),

    // Local Tournament game over screens
    ltIntGameOverScreen: document.getElementById("lt-intermediate-game-over-screen"),
    ltIntGameoverMessage: document.getElementById("lti-game-over-message"),
    ltNextButton: document.getElementById("lt-next-match"),

    ltGameOverScreen: document.getElementById("lg-game-over-screen"),
    ltGameOverMessage: document.getElementById('lt-game-over-message'),
    ltPlayAgainButton: document.getElementById('lt-play-again-button'),
    ltToMenuButton: document.getElementById('lt-back-to-menu'),

    logoutButton: document.getElementById('logout-button'),
};


