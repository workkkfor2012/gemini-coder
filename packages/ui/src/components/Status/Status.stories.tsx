import { Status } from './Status'

export default {
  component: Status,
}

export const Connected = () => {
  return <Status is_connected={true} />
}

export const Disconnected = () => {
  return <Status is_connected={false} />
}
