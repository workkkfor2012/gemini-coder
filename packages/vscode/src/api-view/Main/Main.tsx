import styles from './Main.module.scss'
import { BUILT_IN_PROVIDERS } from '../../constants/built-in-providers'

type Props = {
  providers: any[]
  defaultFimModel: string
  defaultRefactoringModel: string
  defaultApplyChangesModel: string
  onFimModelChange: (model: string) => void
  onRefactoringModelChange: (model: string) => void
  onApplyChangesModelChange: (model: string) => void
}

export const Main: React.FC<Props> = ({
  providers,
  defaultFimModel,
  defaultRefactoringModel,
  defaultApplyChangesModel,
  onFimModelChange,
  onRefactoringModelChange,
  onApplyChangesModelChange
}) => {
  const providerOptions = [
    ...BUILT_IN_PROVIDERS.map((provider) => ({
      name: provider.name,
      value: provider.name
    })),
    ...providers.map((provider) => ({
      name: provider.name,
      value: provider.name
    }))
  ]

  return (
    <div className={styles.container}>
      <div>Select default models</div>
      <div className={styles['model-select']}>
        <label>FIM</label>
        <select
          value={defaultFimModel}
          onChange={(e) => onFimModelChange(e.target.value)}
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
          value={defaultRefactoringModel}
          onChange={(e) => onRefactoringModelChange(e.target.value)}
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
          value={defaultApplyChangesModel}
          onChange={(e) => onApplyChangesModelChange(e.target.value)}
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
