export const DOM = {
    canvas: document.getElementById('pong'),
    ctx: document.getElementById('pong').getContext('2d'),
    registrationScreen: document.getElementById('registration-screen'),
    gameScreen: document.getElementById('game-screen'),
    registrationForm: document.getElementById('registration-form'),
    aliasInput: document.getElementById('alias-input'),
    startButton: document.getElementById('start-button'),
    canvasImg: (() => {
        const img = new Image();
        img.src = './canvas.jpg';
        return img;
    })(),
};
