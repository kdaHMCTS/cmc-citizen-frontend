import { request } from 'integration-test/helpers/clients/base/request'
import * as url from 'url'
import * as urlencode from 'urlencode'
import { Logger } from '@hmcts/nodejs-logging'

const NodeCache = require('node-cache')

const logger = Logger.getLogger('idamClient')

const idamTokenCache = new NodeCache({ stdTTL: 25200, checkperiod: 1800 })

const baseURL: string = process.env.IDAM_URL

const defaultPassword = process.env.SMOKE_TEST_USER_PASSWORD

const oauth2 = {
  client_id: 'cmc_citizen',
  redirect_uri: `${process.env.CITIZEN_APP_URL}/receiver`,
  client_secret: process.env.OAUTH_CLIENT_SECRET
}

export class IdamClient {

  /**
   * Creates user with default password
   *
   * @param {string} email
   * @param {string} userRoleCode
   * @param password the user's password, will use a default if undefined
   * @returns {Promise<void>}
   */
  static createUser (email: string, userRoleCode: string, password: string = process.env.SMOKE_TEST_USER_PASSWORD): Promise<void> {
    const options = {
      method: 'POST',
      uri: `${baseURL}/testing-support/accounts`,
      body: {
        email: email,
        forename: 'John',
        surname: 'Smith',
        levelOfAccess: 0,
        roles: [{ code: userRoleCode }],
        activationDate: '',
        lastAccess: '',
        password: password ? password : defaultPassword
      }
    }
    return request(options).then(function () {
      return Promise.resolve()
    })
  }

  /**
   * Deletes user with the supplied username
   *
   * @returns {Promise<void>}
   */
  static deleteUser (username: string): Promise<void> {
    const options = {
      method: 'DELETE',
      uri: `${baseURL}/testing-support/accounts/${username}`
    }

    return request(options).then(function (resp) {
      return Promise.resolve()
    }).catch(function (err) {
      // tslint:disable-next-line:no-console
      console.log('error deleting user: ' + err)
    })
  }

  /**
   * Deletes users with the supplied usernames
   *
   * @returns {Promise<void>}
   */
  static deleteUsers (usernames: string[]): Promise<void> {
    let params = usernames.map(function (s) {
      return `userNames=${encodeURIComponent(s)}`
    }).join('&')

    const options = {
      method: 'DELETE',
      uri: `${baseURL}/testing-support/test-data?${params}`
    }

    return request(options).then(function (resp) {
      // tslint:disable-next-line:no-console
      console.log(resp)
      return Promise.resolve()
    }).catch(function (err) {
      // tslint:disable-next-line:no-console
      console.log('error deleting user: ' + err)
    })
  }

  /**
   * Authenticate user and get idam token from cache/idam
   *
   * @param {string} username the username to authenticate
   * @param password the users password (optional, default will be used if none provided)
   * @returns {Promise<string>} the users access token
   */
  static async authenticateUser (username: string, password: string = undefined): Promise<string> {
    if (idamTokenCache.get(username) != null) {
      logger.info('Access token from cache: ', username)
      return idamTokenCache.get(username)
    } else {
      logger.info('Access token from idam: ', username)
      const accessToken = await IdamClient.getAccessTokenFromIdam(username, password)
      idamTokenCache.set(username, accessToken)
      return accessToken
    }
  }

  /**
   * Get idam token from Idam
   *
   * @param {string} username the username to authenticate
   * @param password the users password (optional, default will be used if none provided)
   * @returns {Promise<string>} the users access token
   */
  static async getAccessTokenFromIdam (username: string, password: string = undefined): Promise<string> {
    const base64Authorisation: string = IdamClient.toBase64(`${username}:${password || defaultPassword}`)
    const oauth2Params: string = IdamClient.toUrlParams(oauth2)

    const options = {
      method: 'POST',
      uri: `${baseURL}/oauth2/authorize?response_type=code&${oauth2Params}`,
      headers: {
        Authorization: `Basic ${base64Authorisation}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
    return request(options).then(function (response) {
      return response.code
    }).then(function (response) {
      return IdamClient.exchangeCode(response).then(function (response) {
        return response
      })
    })
  }

  static getPin (letterHolderId: string): Promise<string> {
    const options = {
      uri: `${baseURL}/testing-support/accounts/pin/${letterHolderId}`,
      resolveWithFullResponse: true,
      rejectUnauthorized: false,
      json: false
    }
    return request(options).then(function (response) {
      return response.body
    })
  }

  /**
   * Authorizes pin user
   *
   * @param {string} pin
   * @returns {Promise<string>} bearer token
   */
  static async authenticatePinUser (pin: string): Promise<string> {
    const oauth2Params: string = IdamClient.toUrlParams(oauth2)
    const options = {
      uri: `${baseURL}/pin?${oauth2Params}`,
      headers: {
        pin,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      simple: false,
      followRedirect: false,
      json: false,
      resolveWithFullResponse: true
    }
    return request(options).then(function (response) {
      return response
    }).then(function (response) {
      const code: any = new url.URL(response.headers.location)
      return IdamClient.exchangeCode(code).then(function (response) {
        return response
      })
    })
  }

  static exchangeCode (code: string): Promise<string> {

    const options = {
      method: 'POST',
      uri: `${baseURL}/oauth2/token`,
      auth: {
        username: oauth2.client_id,
        password: oauth2.client_secret
      },
      form: { grant_type: 'authorization_code', code: code, redirect_uri: oauth2.redirect_uri }
    }

    return request(options).then(function (response) {
      return response['access_token']
    })
  }

  /**
   * Retrieves uses details
   *
   * @param {string} jwt
   * @returns {Promise<User>}
   */
  static retrieveUser (jwt: string): Promise<User> {
    const options = {
      uri: `${baseURL}/details`,
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    }
    return request(options).then(function (response) {
      return response
    })
  }

  private static toBase64 (value: string): string {
    return Buffer.from(value).toString('base64')
  }

  private static toUrlParams (value: object): string {
    return Object.entries(value).map(([key, val]) => `${key}=${urlencode(val)}`).join('&')
  }
}
