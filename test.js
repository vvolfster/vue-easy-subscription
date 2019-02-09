const Firebase = require('firebase')
const firestore = require('./dist/builtin/firestore')

const config = "PASTE CONFIG HERE"

Firebase.initializeApp(config)

function wait() {
    setTimeout(wait, 1000)
}

async function start() {
    const sub = firestore.getSubFn(Firebase.firestore())
    const users = [
        `users/Qchbdf0megRs57Eoa7LiCFMMqEA3`,
        `users/hHqYJZjXXCW38zR9wLzcDq4Jo912`
    ]
    sub(users, console.log)
    wait()
}

start();