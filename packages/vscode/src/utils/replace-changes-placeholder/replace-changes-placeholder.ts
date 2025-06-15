import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { get_git_repository } from '../git-repository-utils'
import { Logger } from '../logger'

export const replace_changes_placeholder = async (
  instruction: string
): Promise<string> => {
  const matches = instruction.match(/@changes:([^\s]+)/)
  if (!matches) {
    return instruction
  }

  const branch_name = matches[1]
  const repository = get_git_repository()
  if (!repository) {
    vscode.window.showErrorMessage('No Git repository found.')
    return instruction.replace(new RegExp(`@changes:${branch_name}`, 'g'), '')
  }

  try {
    const diff = execSync(`git diff ${branch_name}`, {
      cwd: repository.rootUri.fsPath
    }).toString()

    if (!diff || diff.length == 0) {
      vscode.window.showInformationMessage(
        `No changes found between current branch and ${branch_name}.`
      )
      return instruction.replace(new RegExp(`@changes:${branch_name}`, 'g'), '')
    }

    const replacement_text = `\n\`\`\`diff\n${diff}\n\`\`\`\n`
    return instruction.replace(
      new RegExp(`@changes:${branch_name}`, 'g'),
      replacement_text
    )
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to get changes from branch ${branch_name}. Make sure the branch exists.`
    )
    Logger.error({
      function_name: 'replace_changes_placeholder',
      message: `Error getting diff from branch ${branch_name}`,
      data: error
    })
    return instruction.replace(new RegExp(`@changes:${branch_name}`, 'g'), '')
  }
}
