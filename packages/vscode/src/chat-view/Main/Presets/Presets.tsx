import React from 'react'
import styles from './Presets.module.scss'
import { CHATBOTS } from '@shared/constants/chatbots'

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
    on_preset_click: (preset_idx: number) => void
  }
}

export const Presets: React.FC<Presets.Props> = ({
  presets,
  on_preset_click
}) => {
  if (presets.length == 0) return null

  return (
    <div className={styles['presets-list']}>
      <h3>Web Chat Presets</h3>
      {presets.map((preset, i) => (
        <div
          key={i}
          className={styles['preset-item']}
          onClick={() => on_preset_click(i)}
          style={{ cursor: 'pointer' }}
        >
          <h4>{preset.name}</h4>
          <div className={styles['preset-details']}>
            <div className={styles['detail-row']}>
              <span className={styles.label}>Chatbot:</span>
              <span className={styles.value}>{preset.chatbot}</span>
            </div>

            {preset.model && (
              <div className={styles['detail-row']}>
                <span className={styles.label}>Model:</span>
                <span className={styles.value}>{preset.model}</span>
              </div>
            )}

            {preset.temperature !== undefined && (
              <div className={styles['detail-row']}>
                <span className={styles.label}>Temperature:</span>
                <span className={styles.value}>{preset.temperature}</span>
              </div>
            )}

            {preset.prompt_prefix && (
              <div className={styles['detail-row']}>
                <span className={styles.label}>Prefix:</span>
                <span className={styles.value}>
                  {truncate(preset.prompt_prefix, 25)}
                </span>
              </div>
            )}

            {preset.prompt_suffix && (
              <div className={styles['detail-row']}>
                <span className={styles.label}>Suffix:</span>
                <span className={styles.value}>
                  {truncate(preset.prompt_suffix, 25)}
                </span>
              </div>
            )}

            {preset.system_instructions && (
              <div className={styles['detail-row']}>
                <span className={styles.label}>System Instructions:</span>
                <span className={styles.value}>
                  {truncate(preset.system_instructions, 25)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}
