const readline = require('readline');

function waitForHuman(message){
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(`${message} (press Enter to continue)`, () => {
            rl.close();
            resolve();
        });
    });
}

module.exports = { waitForHuman };