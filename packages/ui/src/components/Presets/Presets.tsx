import styles from './Presets.module.scss'
import { CHATBOTS } from '@shared/constants/chatbots'
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
    on_preset_click: (idx: number) => void
    disabled: boolean
    selected_presets: number[]
    on_selected_presets_change: (selected_indices: number[]) => void
    on_edit_presets: () => void
    expanded_presets: number[]
    on_expanded_presets_change: (expanded_indices: number[]) => void
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
  const toggle_expand = (index: number) => {
    const new_expanded = props.expanded_presets.includes(index)
      ? props.expanded_presets.filter((i) => i != index)
      : [...props.expanded_presets, index]
    props.on_expanded_presets_change(new_expanded)
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

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <span>MY PRESETS</span>
        {!props.disabled && (
          <IconButton codicon_icon="edit" on_click={props.on_edit_presets} />
        )}
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
                    props.expanded_presets.includes(i)
                      ? 'codicon-chevron-up'
                      : 'codicon-chevron-down'
                  )}
                />
              </div>
            </div>

            {props.expanded_presets.includes(i) && (
              <div className={styles.presets__item__details}>
                <div className={styles.presets__item__details__actions}>
                  <IconButton
                    codicon_icon="send"
                    on_click={() => props.on_preset_click?.(i)}
                  />
                  <label>
                    Use by default
                    <input
                      type="checkbox"
                      checked={props.selected_presets?.includes(i) || false}
                      onChange={() => handle_checkbox_change(i)}
                    />
                  </label>
                </div>

                <div className={styles.presets__item__details__row}>
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
          <Button on_click={props.on_edit_presets}>Edit Presets</Button>
        </div>
      </div>
    </div>
  )
}
