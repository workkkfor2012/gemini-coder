import React from 'react'
import Chevron from '../../assets/icons/chevron.svg'

export namespace Icon {
  export type Props = {
    variant: 'CHEVRON'
  }
}

export const Icon: React.FC<Icon.Props> = (props) => {
  let icon: JSX.Element

  switch (props.variant) {
    case 'CHEVRON':
      icon = <Chevron />
      break
  }

  return icon
}
