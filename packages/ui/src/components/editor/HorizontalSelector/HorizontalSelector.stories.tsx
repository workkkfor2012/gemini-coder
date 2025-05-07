import { HorizontalSelector } from './HorizontalSelector'
import { useState } from 'react'

export default {
  component: HorizontalSelector,
  title: 'Components/HorizontalSelector'
}

export const EditFormatExample = () => {
  const [format, set_format] = useState<string>('truncated')

  const options = [
    {
      value: 'truncated',
      label: 'Truncated',
      title: 'Truncated format description'
    },
    {
      value: 'whole',
      label: 'Whole',
      title: 'Whole format description'
    },
    {
      value: 'diff',
      label: 'Diff',
      title: 'Diff format description'
    }
  ]

  return (
    <HorizontalSelector
      heading="Edit Format"
      options={options}
      selected_value={format}
      on_select={set_format}
    />
  )
}

export const GenericExample = () => {
  const [value, set_value] = useState<string>('option1')

  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ]

  return (
    <HorizontalSelector
      heading="Generic Selector"
      options={options}
      selected_value={value}
      on_select={set_value}
    />
  )
}
