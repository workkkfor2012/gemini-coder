import styles from './Presets.module.scss'
import { CHATBOTS } from '@shared/constants/chatbots'
import { useState } from 'react'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import cn from 'classnames'

export namespace Presets {
  export type Preset = {
    name: string
    chatbot: keyof typeof CHATBOTS
    prompt_prefix?: string
    prompt_suffix?: string
    model?: string
    temperature?: number
    system_instructions?: string
  }

  export type Props = {
    presets: Preset[]
    on_preset_click?: (idx: number) => void
    disabled?: boolean
    selected_presets?: number[]
    on_selected_presets_change?: (selected_indices: number[]) => void
    on_edit_presets?: () => void
  }
}

const DetailField = ({
  label,
  value
}: {
  label: string
  value: string | number | undefined
}) => {
  if (!value) return null

  return (
    <div className={styles.presets__item__details__row__field}>
      <span className={styles.presets__item__details__row__field__label}>
        {label}
      </span>
      <span className={styles.presets__item__details__row__field__value}>
        {value}
      </span>
    </div>
  )
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const [expanded_presets, set_expanded_presets] = useState<number[]>([])

  const toggle_expand = (index: number) => {
    set_expanded_presets((prev) =>
      prev.includes(index) ? prev.filter((i) => i != index) : [...prev, index]
    )
  }

  const handle_checkbox_change = (index: number) => {
    if (props.on_selected_presets_change) {
      const new_selected = props.selected_presets?.includes(index)
        ? props.selected_presets.filter((i) => i !== index)
        : [...(props.selected_presets || []), index]
      props.on_selected_presets_change(new_selected)
    }
  }

  if (props.presets.length == 0) return null

  const open_settings = () => {
    if (!props.disabled && props.on_edit_presets) {
      props.on_edit_presets()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <span>MY PRESETS</span>
        <IconButton codicon_icon="edit" on_click={open_settings} />
      </div>

      <div
        className={cn(styles.presets, {
          [styles['presets--disabled']]: props.disabled
        })}
      >
        {props.presets.map((preset, i) => (
          <div key={i} className={styles.presets__item}>
            <div
              className={styles.presets__item__header}
              onClick={() => toggle_expand(i)}
              role="button"
            >
              <div
                className={cn(styles.presets__item__header__title, {
                  [styles['presets__item__header__title--default']]:
                    props.selected_presets?.includes(i)
                })}
              >
                <span>{preset.name}</span>
              </div>
              <div className={styles.presets__item__header__right}>
                <div
                  className={cn(
                    'codicon',
                    expanded_presets.includes(i)
                      ? 'codicon-chevron-up'
                      : 'codicon-chevron-down'
                  )}
                />
              </div>
            </div>

            {expanded_presets.includes(i) && (
              <div className={styles.presets__item__details}>
                <div className={styles.presets__item__details__actions}>
                  <IconButton
                    codicon_icon="send"
                    on_click={() => props.on_preset_click?.(i)}
                  />
                </div>

                <div className={styles.presets__item__details__row}>
                  <label className={styles.presets__item__details__row__label}>
                    <input
                      type="checkbox"
                      checked={props.selected_presets?.includes(i) || false}
                      onChange={() => handle_checkbox_change(i)}
                      className={styles.presets__item__details__row__checkbox}
                    />
                    Use by default
                  </label>
                  <DetailField label="Chatbot" value={preset.chatbot} />
                  <DetailField label="Model" value={preset.model} />
                  <DetailField label="Temperature" value={preset.temperature} />
                  <DetailField
                    label="Prompt Prefix"
                    value={preset.prompt_prefix}
                  />
                  <DetailField
                    label="Prompt Suffix"
                    value={preset.prompt_suffix}
                  />
                  <DetailField
                    label="System Instructions"
                    value={preset.system_instructions}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        <div className={styles.presets__edit}>
          <Button on_click={open_settings}>Edit Presets</Button>
        </div>
      </div>
    </div>
  )
}
