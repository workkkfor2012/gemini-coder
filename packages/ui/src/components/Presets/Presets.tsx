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
    on_preset_click: (idx: number) => void
    disabled?: boolean
  }
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const [expanded_presets, set_expanded_presets] = useState<number[]>([])

  const toggle_expand = (index: number) => {
    set_expanded_presets((prev) =>
      prev.includes(index) ? prev.filter((i) => i != index) : [...prev, index]
    )
  }

  const handle_edit_presets = () => {
    window.open('vscode://settings/geminiCoder.webChatPresets')
  }

  if (props.presets.length == 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <span>MY PRESETS</span>
      </div>

      <div
        className={cn(styles.presets, {
          [styles['presets--disabled']]: props.disabled
        })}
      >
        {props.presets.map((preset, i) => (
          <div key={i} className={styles.presets__item}>
            <div className={styles.presets__item__header}>
              <div
                className={styles.presets__item__header__title}
                onClick={() => {
                  props.on_preset_click(i)
                }}
              >
                {preset.name}
              </div>
              <div className={styles.presets__item__header__right}>
                <IconButton
                  codicon_icon={
                    expanded_presets.includes(i) ? 'chevron-up' : 'chevron-down'
                  }
                  on_click={() => toggle_expand(i)}
                />
                <IconButton
                  codicon_icon="link-external"
                  on_click={() => {
                    props.on_preset_click(i)
                  }}
                />
              </div>
            </div>

            {expanded_presets.includes(i) && (
              <div className={styles.presets__item__details}>
                <div className={styles.presets__item__details__row}>
                  Chatbot: {preset.chatbot}
                </div>
                {preset.model && (
                  <div className={styles.presets__item__details__row}>
                    Model: {preset.model}
                  </div>
                )}
                {preset.temperature && (
                  <div className={styles.presets__item__details__row}>
                    Temperature: {preset.temperature}
                  </div>
                )}
                {preset.prompt_prefix && (
                  <div className={styles.presets__item__details__row}>
                    Prompt prefix: {preset.prompt_prefix}
                  </div>
                )}
                {preset.prompt_suffix && (
                  <div className={styles.presets__item__details__row}>
                    Prompt suffix: {preset.prompt_suffix}
                  </div>
                )}
                {preset.system_instructions && (
                  <div className={styles.presets__item__details__row}>
                    System instructions: {preset.system_instructions}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div className={styles.presets__edit}>
          <Button on_click={handle_edit_presets}>Edit Presets</Button>
        </div>
      </div>
    </div>
  )
}
