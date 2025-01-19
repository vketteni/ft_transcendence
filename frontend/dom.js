export const DOM = {
    // Top bar
    topBar: document.getElementById('topbar'),
    topBarNav: document.getElementById('topbar-nav'),
    topBarLogo: document.getElementById('logo'),

    // game canvas
    canvas: document.getElementById('canvas'),
    ctx: document.getElementById('canvas').getContext('2d'),
	matchmakingButton: document.getElementById('matchmaking-button'),
    matchmakingTimer: document.getElementById('timerDisplay'),
    canvasImg: (() => {
        const img = new Image();
        img.src = './canvas.png';
        return img;
    })(),
    
    // animated video background
    // backgroundCanvas: document.getElementById('background-animation'),
    // backgroundCtx: document.getElementById('background-animation').getContext('2d'), 
    
    // screens
    gameScreen: document.getElementById('game-screen'),
    registrationScreen: document.getElementById('registration-screen'),
    loginScreen: document.getElementById('login-screen'),
    signupScreen: document.getElementById('signup-screen'),
    categoryScreen: document.getElementById('category-screen'),
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
    
    // sing up form
    signupAlias: document.getElementById('signup-alias'),
    signupPassword: document.getElementById('signup-password'),
    signupEmail: document.getElementById('signup-email'),
    
    // Category screen buttons  
    PvPButton: document.getElementById('PvP'),
    PvCButton: document.getElementById('PvC'),
    // TournamentButton: document.getElementById('Tournament'),

    // User profile screen
    editProfileButton: document.getElementById('editProfileButton'),
    cancelEditButton: document.getElementById('cancelEditButton'),
    profileButton: document.getElementById('profileButton'),

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
    
    // Game over screen
    gameOverScreen: document.getElementById('game-over-screen'),
    gameOverMessage: document.getElementById('game-over-message'),
    playAgainButton: document.getElementById('play-again-button'),

    logoutButton: document.getElementById('logout-button'),
};

DOM.canvasImg.onerror = () => {
    console.error('Image failed to load. Check the file path.');
};

