import styles from './Main.module.scss'
import { BUILT_IN_PROVIDERS } from '../../constants/built-in-providers'

type Props = {
  providers: any[]
  default_fim_model: string
  default_refactoring_model: string
  default_apply_changes_model: string
  on_fim_model_change: (model: string) => void
  on_refactoring_model_change: (model: string) => void
  on_apply_changes_model_change: (model: string) => void
}

export const Main: React.FC<Props> = (props) => {
  const providerOptions = [
    ...BUILT_IN_PROVIDERS.map((provider) => ({
      name: provider.name,
      value: provider.name
    })),
    ...props.providers.map((provider) => ({
      name: provider.name,
      value: provider.name
    }))
  ]

  return (
    <div className={styles.container}>
      <div>Select default models for given features:</div>
      <div className={styles['model-select']}>
        <label>FIM</label>
        <select
          value={props.default_fim_model}
          onChange={(e) => props.on_fim_model_change(e.target.value)}
        >
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles['model-select']}>
        <label>File Refactoring</label>
        <select
          value={props.default_refactoring_model}
          onChange={(e) => props.on_refactoring_model_change(e.target.value)}
        >
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles['model-select']}>
        <label>Apply Changes</label>
        <select
          value={props.default_apply_changes_model}
          onChange={(e) => props.on_apply_changes_model_change(e.target.value)}
        >
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
