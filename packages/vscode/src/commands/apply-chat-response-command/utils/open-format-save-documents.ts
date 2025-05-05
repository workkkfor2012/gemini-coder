import * as vscode from 'vscode'
import { Logger } from '../../../helpers/logger'
import { format_document } from './format-document'

export async function open_format_and_save_documents(
  file_paths: string[],
  workspace_path: string
): Promise<void> {
  Logger.log({
    function_name: 'openFormatAndSaveDocuments',
    message: 'Starting to process files',
    data: { fileCount: file_paths.length, workspace_path }
  })

  for (const file_path of file_paths) {
    try {
      // Construct the full URI for the file
      const file_uri = vscode.Uri.file(`${workspace_path}/${file_path}`)

      // Open the document
      const document = await vscode.workspace.openTextDocument(file_uri)

      // Format the document
      await format_document(document)

      // Save the document
      await document.save()

      Logger.log({
        function_name: 'openFormatAndSaveDocuments',
        message: 'Successfully processed file',
        data: { file_path }
      })
    } catch (error) {
      Logger.error({
        function_name: 'openFormatAndSaveDocuments',
        message: 'Error processing file',
        data: { file_path, error }
      })
      console.error(`Error processing file ${file_path}: ${error}`)
      // Continue with other files even if one fails
    }
  }

  Logger.log({
    function_name: 'openFormatAndSaveDocuments',
    message: 'Completed processing all files',
    data: { fileCount: file_paths.length }
  })
}
