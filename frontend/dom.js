export const DOM = {
    // Top bar
    topBar: document.getElementById('topbar'),
    topBarNav: document.getElementById('topbar-nav'),
    topBarLogo: document.getElementById('logo'),

    // game canvas
    gameScreen: document.getElementById('game-screen'),
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
    registrationScreen: document.getElementById('registration-screen'),
    loginScreen: document.getElementById('login-screen'),
    signupScreen: document.getElementById('signup-screen'),
    categoryScreen: document.getElementById('category-screen'),

    // login/signup screen
    loginButton: document.getElementById('login-button'),
    signupButton: document.getElementById('signup-button'),

    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),

    // login form
    loginAlias: document.getElementById('login-alias'),
    loginPassword: document.getElementById('login-password'),
    login42Button: document.getElementById('login-42-button'),

    // sing up form
    signupAlias: document.getElementById('signup-alias'),
    signupPassword: document.getElementById('signup-password'),

    // Category screen buttons  
    PvPButton: document.getElementById('PvP'),
    PvCButton: document.getElementById('PvC'),
    // TournamentButton: document.getElementById('Tournament'),

    // Game screen
    pauseButton: document.getElementById('pause-button'),

    // Game over screen
    gameOverScreen: document.getElementById('game-over-screen'),
    gameOverMessage: document.getElementById('game-over-message'),
    playAgainButton: document.getElementById('play-again-button'),
};

DOM.canvasImg.onerror = () => {
    console.error('Image failed to load. Check the file path.');
};

