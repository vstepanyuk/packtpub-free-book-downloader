const request      = require('request')
const cheerio      = require('cheerio')
const EventEmitter = require('events')
const rp           = require('request-promise')
const debug        = require('debug')('client')
const fs           = require('fs')

class Client extends EventEmitter {
    constructor(config = {}) {
        super()
        this.config  = config
        this.baseUrl = 'https://www.packtpub.com'
        this.jar     = request.jar()
    }

    _login() {
        return this._request('/packt/offers/free-learning').then($ => {
            const $form = $('#packt-user-login-form')
            const data = $form
                .serializeArray()
                .reduce((prev, curr) => Object.assign(prev, {[curr.name]: curr.value}), {})

            data.email    = this.config.email
            data.password = this.config.password
            data.op       = 'Login'

            return this._request('/packt/offers/free-learning', $form.attr('method'), data, { resolveWithFullResponse: true, transform: null, followRedirect: false })
        })
        .then(() => { throw new Error("Couldn't login!") })
        .catch(e => {
            if (e.response && e.response.headers && e.response.headers.location === 'https://www.packtpub.com/packt/offers/free-learning') {
                return this._request(e.response.headers.location)
            }

            throw e
        })
    }

    _request(uri, method = 'get', data = {}, options = {}) {
        if (uri.indexOf(this.baseUrl) !== 0) {
            uri = `${this.baseUrl}${uri}`
        }

        const _options = Object.assign({
            uri,
            jar: this.jar,
            transform: (body) => cheerio.load(body)
        }, options)

        if ('post' === method.toLowerCase()) {
            _options.method = 'post'
            _options.form   = data
        }

        debug('request', _options)

        return rp(_options)
    }

    _lastBookInfo(url) {
        return this._request(url).then($ => {
            const $book = $('#product-account-list .product-line').first()
            const $cover = $book.find('.product-thumbnail img.imagecache-thumbview').first()

            const title = $cover.attr('title').trim()
            const image = $cover.attr('src').trim()

            const pdf = $book.find('.fake-button[format="pdf"]').parent().attr('href')
            const epub = $book.find('.fake-button[format="epub"]').parent().attr('href')

            return {
                title, image, pdf: `${this.baseUrl}${pdf}`, epub: `${this.baseUrl}${epub}`
            }
        })
    }

    download(book, path = '') {
        const urls = [{
            name: `${path}/${book.title}.pdf`, 
            url: book.pdf
        }, {
            name: `${path}/${book.title}.epub`, 
            url: book.epub
        }]

        return Promise.all(urls.map(url => new Promise((resolve, reject) => {
            const downloadRequest = request({ uri: url.url, jar: this.jar })
            downloadRequest.pipe(fs.createWriteStream(url.name))
            downloadRequest.on('end', () => resolve(url.name))
        }))).then(files => Object.assign({ files }, book))
    }

    fetchLast() {
        return this._login()
            .then($ => this._lastBookInfo($('.free-ebook a.twelve-days-claim').attr('href')))
    }
}

module.exports = Client