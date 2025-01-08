export const DOM = {
    canvas: document.getElementById('pong'),
    ctx: document.getElementById('pong').getContext('2d'),

    backgroundCanvas: document.getElementById('background-animation'),
    backgroundCtx: document.getElementById('background-animation').getContext('2d'), 
    
    registrationScreen: document.getElementById('registration-screen'),


    loginScreen: document.getElementById('login-screen'),
    signupScreen: document.getElementById('signup-screen'),
    categoryScreen: document.getElementById('category-screen'),

    loginButton: document.getElementById('login-button'),
    signupButton: document.getElementById('signup-button'),

    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),

    loginAlias: document.getElementById('login-alias'),
    loginPassword: document.getElementById('login-password'),
    login42Button: document.getElementById('login-42-button'),

    signupAlias: document.getElementById('signup-alias'),
    signupPassword: document.getElementById('signup-password'),

    PvPButton: document.getElementById('PVP-button'),
	PvCButton: document.getElementById('PVC-button'),
	TournamentButton: document.getElementById('Tournament-button'),
    pauseButton: document.getElementById('pause-button'),
    canvasImg: (() => {
        const img = new Image();
        img.src = './canvas.png';
        return img;
    })(),
};

DOM.canvasImg.onerror = () => {
    console.error('Image failed to load. Check the file path.');
};