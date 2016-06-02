const Client   = require('./client')
const inquirer = require('inquirer') 
const argv     = require('minimist')(process.argv.slice(2))
const chalk    = require('chalk')
const ora      = require('ora')

const promises  = []
const questions = []

if (argv.user || argv.u) {
  promises.push(Promise.resolve({ user: argv.user || argv.u }))
} else {
  questions.push({ type: 'input', name: 'user', message: 'PACKT publishing user' })
}

if (argv.password || argv.p) {
  promises.push(Promise.resolve({ password: argv.password || argv.p }))
} else {
  questions.push({ type: 'password', name: 'password', message: 'PACKT publishing password' })
}

const output = argv.output || process.cwd()

if (questions.length) {
  promises.push(inquirer.prompt(questions))
}

let client = null
let spinner = ora()

Promise.all(promises)
  .then(results => results.reduce((curr, next) => Object.assign(curr, next), {}))
  .then(credentials => {
    client = new Client(credentials)
    spinner.text = 'Authentication...'
    spinner.start()

    return client.fetchLast()
  })
  .then(book => {
    spinner.stop()
    console.log(chalk.bgGreen.black(` Latest book ${book.title} `))
    spinner.text = 'Downloading...'
    spinner.start()

    return client.download(book, output)
  })
  .then(downloaded => {
    spinner.stop()
    downloaded.files.forEach(book => console.log(chalk.green('Downloaded: %s'), book))
  })
  .catch(err => {
    spinner.stop()
    console.error(chalk.bgRed.white(` ${err.message} `))
  })