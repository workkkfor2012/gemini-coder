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
  const options: { value: EditFormat; label: string; title: string }[] = [
    {
      value: 'truncated',
      label: 'Truncated',
      title:
        'Readable format, perfect for iterating over prompt. Applying chat response will use the file refactoring tool.'
    },
    {
      value: 'whole',
      label: 'Whole',
      title: 'Modified files will be sent fully and replaced in place.'
    },
    {
      value: 'diff',
      label: 'Diff',
      title:
        'Uses the least amount of output tokens. Applying chat reponse requires correctness of the diff and fallbacks to the file refactoring tool.'
    }
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
          title={option.title}
        >
          {option.label}
        </div>
      ))}
    </div>
  )
}
