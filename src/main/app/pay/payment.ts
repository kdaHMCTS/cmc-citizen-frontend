import { Serializable } from 'app/models/serializable'

class PaymentState implements Serializable<PaymentState> {
  status: string
  finished: boolean

  deserialize (input?: any): PaymentState {
    if (input) {
      this.status = input.status
      this.finished = input.finished
    }
    return this
  }
}

export default class Payment implements Serializable<Payment> {
  id: string
  amount: number
  reference: string
  description: string
  date_created: number // tslint:disable-line variable-name allow snake_case
  state: PaymentState

  deserialize (input?: any): Payment {
    if (input) {
      this.id = input.id
      this.amount = input.amount
      this.reference = input.reference
      this.description = input.description
      this.date_created = input.date_created
      this.state = new PaymentState().deserialize(input.state)
    }
    return this
  }
}
