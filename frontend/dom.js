export const DOM = {
    canvas: document.getElementById('pong'),
    ctx: document.getElementById('pong').getContext('2d'),
    registrationScreen: document.getElementById('registration-screen'),
    gameScreen: document.getElementById('game-screen'),
    registrationForm: document.getElementById('registration-form'),
    aliasInput: document.getElementById('alias-input'),
    // startButton: document.getElementById('start-button'),
    matchmakingButton: document.getElementById('matchmaking-button'),
    matchmakingTimer: document.getElementById('timerDisplay'),
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