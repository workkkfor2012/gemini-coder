import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { OpenEditorsProvider } from '../context/providers/open-editors-provider'
import { WebsitesProvider } from '../context/providers/websites-provider'
import { natural_sort } from '@/utils/natural-sort'

export class FilesCollector {
  private workspace_provider: WorkspaceProvider
  private open_editors_provider?: OpenEditorsProvider
  private websites_provider?: WebsitesProvider
  private workspace_roots: string[] = []

  constructor(
    workspace_provider: WorkspaceProvider,
    open_editors_provider?: OpenEditorsProvider,
    websites_provider?: WebsitesProvider
  ) {
    this.workspace_provider = workspace_provider
    this.open_editors_provider = open_editors_provider
    this.websites_provider = websites_provider

    this.workspace_roots = workspace_provider.getWorkspaceRoots()
  }

  async collect_files(params?: { exclude_path?: string }): Promise<string> {
    const workspace_files = this.workspace_provider.get_checked_files()
    const open_editor_files =
      this.open_editors_provider?.get_checked_files() || []

    const initial_context_paths = Array.from(
      new Set([...workspace_files, ...open_editor_files])
    )

    console.log(`📁 [FilesCollector] Starting file collection...`)
    console.log(`📁 [FilesCollector] Initial paths count: ${initial_context_paths.length}`)
    console.log(`📁 [FilesCollector] Initial paths:`, initial_context_paths)

    let collected_text = ''

    if (this.websites_provider) {
      const checked_websites = this.websites_provider.get_checked_websites()
      for (const website of checked_websites) {
        collected_text += `<text title="${website.title}">\n<![CDATA[\n${website.content}\n]]>\n</text>\n`
      }
    }

    // Step 1 & 2: Expand all directories into a flat list of files.
    const all_files_to_process: string[] = []
    for (const file_path of initial_context_paths) {
      try {
        if (!fs.existsSync(file_path)) continue

        const stats = fs.statSync(file_path)
        if (stats.isDirectory()) {
          // If it's a directory, find all files within it and add them.
          console.log(`📂 [FilesCollector] Expanding directory: ${file_path}`)
          const files_in_dir = this.workspace_provider.find_all_files(file_path)
          console.log(`📂 [FilesCollector] Found ${files_in_dir.length} files in directory`)
          all_files_to_process.push(...files_in_dir)
        } else if (stats.isFile()) {
          // If it's a file, add it directly.
          console.log(`📄 [FilesCollector] Adding file: ${file_path}`)
          all_files_to_process.push(file_path)
        }
      } catch (error) {
        console.error(`Error processing path ${file_path}:`, error)
      }
    }

    // Step 3: Process the final, flattened list of files.
    // Ensure uniqueness and sort naturally.
    const final_files = Array.from(new Set(all_files_to_process)).sort(
      (a, b) => natural_sort(a, b)
    )

    console.log(`📋 [FilesCollector] Final list of files to be processed:`)
    console.log(`📋 [FilesCollector] Count: ${final_files.length}`)
    console.log(`📋 [FilesCollector] Files:`, final_files)

    for (const file_path of final_files) {
      if (params?.exclude_path && params.exclude_path == file_path) continue
      try {
        // Double-check existence and that it's a file, as find_all_files should already ensure this.
        if (!fs.existsSync(file_path) || !fs.statSync(file_path).isFile()) {
            continue
        }

        const content = fs.readFileSync(file_path, 'utf8')
        const workspace_root = this.get_workspace_root_for_file(file_path)

        if (!workspace_root) {
          collected_text += `<file path="${file_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
          continue
        }

        const relative_path = path.relative(workspace_root, file_path)
        let display_path = relative_path
        if (this.workspace_roots.length > 1) {
          const workspace_name =
            this.workspace_provider.get_workspace_name(workspace_root)
          display_path = `${workspace_name}/${relative_path}`
        }

        collected_text += `<file path="${display_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
      } catch (error) {
        console.error(`Error reading file ${file_path}:`, error)
      }
    }

    return collected_text
  }

  private get_workspace_root_for_file(file_path: string): string | undefined {
    return this.workspace_provider.get_workspace_root_for_file(file_path)
  }
}
