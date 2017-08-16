import { expect } from 'chai'

import DraftClaim from 'app/drafts/models/draftClaim'
import { YourDetails } from 'app/drafts/tasks/yourDetails'

describe('Your details', () => {
  describe('isCompleted', () => {
    it('should return true when the task is completed', () => {
      const input = {
        claimant: {
          name: {
            name: 'John Doe'
          },
          partyDetails: {
            address: {
              line1: 'Here',
              line2: 'There',
              city: 'London',
              postcode: 'BB12 7NQ'
            },
            hasCorrespondenceAddress: false
          },
          dateOfBirth: {
            date: {
              day: 10,
              month: 11,
              year: 1990
            }
          },
          mobilePhone: {
            number: '7123123123'
          }
        }
      }
      const claim: DraftClaim = new DraftClaim().deserialize(input)
      expect(YourDetails.isCompleted(claim)).to.equal(true)
    })

    it('should return false when the task is not completed', () => {
      const claim: DraftClaim = new DraftClaim()
      expect(YourDetails.isCompleted(claim)).to.equal(false)
    })
  })
})
