import React from 'react'
import styles from './EditFormatSelector.module.scss'
import cn from 'classnames'
import { EditFormat } from '../../../../../shared/src/types/edit-format'

export namespace EditFormatSelector {
  export type Props = {
    format: EditFormat
    on_change: (format: EditFormat) => void
  }
}

export const EditFormatSelector: React.FC<EditFormatSelector.Props> = ({
  format,
  on_change
}) => {
  const options: { value: EditFormat; label: string }[] = [
    { value: 'truncated', label: 'Truncated' },
    { value: 'whole', label: 'Whole' },
    { value: 'diff', label: 'Diff' }
  ]

  return (
    <div className={styles.container}>
      {options.map((option) => (
        <div
          key={option.value}
          className={cn(styles['format-option'], {
            [styles['format-option--selected']]: format == option.value
          })}
          onClick={() => on_change(option.value)}
          role="button"
          aria-pressed={format == option.value}
        >
          {option.label}
        </div>
      ))}
    </div>
  )
}
