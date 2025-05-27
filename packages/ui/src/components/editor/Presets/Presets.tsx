import styles from './Presets.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Button } from '../Button/Button'
import cn from 'classnames'
import { ReactSortable } from 'react-sortablejs'
import { Icon } from '../Icon'
import { useState } from 'react'
import { CHATBOTS } from '@shared/constants/chatbots'
import { chatbot_to_icon } from '../../../constants/chatbot-to-icon'
import { TextButton } from '../TextButton'

export namespace Presets {
  export type Preset = {
    id?: string | number
    name: string
    chatbot: keyof typeof CHATBOTS
    has_affixes: boolean
  }

  export type Props = {
    presets: Preset[]
    on_preset_click: (name: string) => void
    disabled: boolean
    selected_presets: string[]
    selected_code_completion_presets: string[]
    on_create_preset: () => void
    is_code_completions_mode: boolean
    on_preset_copy: (name: string) => void
    on_presets_reorder: (reordered_presets: Preset[]) => void
    on_preset_edit: (name: string) => void
    on_preset_duplicate: (name: string) => void
    on_preset_delete: (name: string) => void
    on_set_default_presets: () => void
  }
}

const with_ids = (
  presets: Presets.Preset[]
): (Presets.Preset & { id: string })[] => {
  return presets.map((preset) => ({
    ...preset,
    id: preset.id?.toString() || preset.name
  }))
}

const ChatbotIcon: React.FC<{
  chatbot: keyof typeof CHATBOTS
  is_selected: boolean
  is_disabled: boolean
}> = (params) => {
  const icon_variant = chatbot_to_icon[params.chatbot]

  if (!icon_variant) return null

  return (
    <div
      className={cn(styles.presets__item__left__icon, {
        [styles['presets__item__left__icon--selected']]: params.is_selected,
        [styles['presets__item__left__icon--disabled']]: params.is_disabled
      })}
    >
      <Icon variant={icon_variant} />
    </div>
  )
}

export const Presets: React.FC<Presets.Props> = (props) => {
  const [highlighted_preset_name, set_highlighted_preset_name] =
    useState<string>()

  if (props.presets.length == 0) return null

  return (
    <div className={styles.container}>
      <div className={styles['my-presets']}>
        <div className={styles['my-presets__left']}>
          <span>MY PRESETS</span>

          <IconButton
            codicon_icon="info"
            href="https://codeweb.chat/features/chat"
          />
        </div>

        <TextButton
          on_click={props.on_set_default_presets}
          title="Set presets opening by default"
        >
          Select default
        </TextButton>
      </div>

      <div
        className={cn(styles.presets, {
          [styles['presets--disabled']]: props.disabled
        })}
      >
        <ReactSortable
          list={with_ids(props.presets)}
          setList={(new_state) => {
            if (props.on_presets_reorder) {
              const clean_presets = new_state.map(({ id, ...preset }) => preset)
              props.on_presets_reorder(clean_presets)
            }
          }}
          animation={150}
          handle={`.${styles.presets__item__right__drag_handle}`}
          disabled={props.disabled}
        >
          {props.presets.map((preset, i) => {
            const is_disabled_in_code_completion_mode =
              props.is_code_completions_mode && preset.has_affixes

            return (
              <div
                key={i}
                className={cn(styles.presets__item, {
                  [styles['presets__item--highlighted']]:
                    highlighted_preset_name == preset.name,
                  [styles['presets__item--disabled']]:
                    is_disabled_in_code_completion_mode
                })}
                onClick={() => {
                  if (is_disabled_in_code_completion_mode) return
                  props.on_preset_click(preset.name)
                  set_highlighted_preset_name(preset.name)
                }}
                role="button"
                title={
                  is_disabled_in_code_completion_mode
                    ? `${preset.name} (Presets with prompt prefix or suffix are unaviailable for code completions)`
                    : preset.name
                }
              >
                <div className={styles.presets__item__left}>
                  <ChatbotIcon
                    chatbot={preset.chatbot}
                    is_selected={
                      !props.is_code_completions_mode
                        ? props.selected_presets.includes(preset.name)
                        : props.selected_code_completion_presets.includes(
                            preset.name
                          )
                    }
                    is_disabled={is_disabled_in_code_completion_mode}
                  />

                  <div
                    className={cn(styles.presets__item__left__title, {
                      [styles['presets__item__left__title--selected']]:
                        !props.is_code_completions_mode
                          ? props.selected_presets.includes(preset.name)
                          : props.selected_code_completion_presets.includes(
                              preset.name
                            ),
                      [styles['presets__item__left__title--disabled']]:
                        is_disabled_in_code_completion_mode
                    })}
                  >
                    {preset.name}
                  </div>
                </div>
                <div
                  className={styles.presets__item__right}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  {preset.has_affixes && !props.disabled && (
                    <IconButton
                      codicon_icon="copy"
                      title="Copy to clipboard"
                      on_click={(e) => {
                        e.stopPropagation()
                        props.on_preset_copy(preset.name)
                      }}
                    />
                  )}
                  <IconButton
                    codicon_icon="files"
                    title="Duplicate"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_duplicate(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="edit"
                    title="Edit"
                    on_click={(e) => {
                      e.stopPropagation()
                      set_highlighted_preset_name(preset.name)
                      props.on_preset_edit(preset.name)
                    }}
                  />
                  <IconButton
                    codicon_icon="trash"
                    title="Delete"
                    on_click={(e) => {
                      e.stopPropagation()
                      props.on_preset_delete(preset.name)
                    }}
                  />
                  <div className={styles.presets__item__right__drag_handle}>
                    <span className="codicon codicon-gripper" />
                  </div>
                </div>
              </div>
            )
          })}
        </ReactSortable>
      </div>

      <div className={styles.presets__create}>
        <Button on_click={props.on_create_preset}>Create Preset</Button>
      </div>
    </div>
  )
}
