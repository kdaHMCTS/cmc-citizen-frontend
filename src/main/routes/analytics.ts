import * as express from 'express'
import * as config from 'config'

class Paths {
  static main: string = '/analytics'
}

export default express.Router()
  .get(Paths.main, (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    const site = config.get('analytics')

    res.send(JSON.stringify(site))
  })
