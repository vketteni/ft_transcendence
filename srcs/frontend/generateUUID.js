export function generateUUID() {
    let id = "";
    const digits = "0123456789";
    for (let i = 0; i < 10; i++) { 
        id += digits[Math.floor(Math.random() * 10)];
    }
    return id;
}
