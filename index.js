const Client    = require('./client')
const Datastore = require('nedb')
const config    = require('./config')

const db = new Datastore({ filename: `${__dirname}/books.db`, autoload: true })
const client = new Client(config)

client.fetchLast().then(book => new Promise((res, rej) => {
    db.findOne({ title: book.title }, (err, result) => {
        if (err) return rej(err)
        if (result) return rej('Book is downloaded already')
        res(book)
    })
}))
.then(book => client.download(book, process.argv[2] || `${__dirname}/books/`))
.then(downloaded => new Promise((res, rej) => {
    console.log("Downloaded", downloaded)
    db.insert(downloaded, (err, result) => {
        if (err) return rej(err)
        res(result)
    })
}))
.catch(error => console.error('Error:', error))