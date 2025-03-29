import { Website } from '@/views/popup/hooks/use-websites-store'
import { HtmlParser } from '../utils/html-parser'

export type GetPageDataMessage = {
  action: 'get-page-data'
}

export type PageDataMessage = {
  action: 'page-data'
  parsed_html: HtmlParser.ParsedResult | null
  favicon?: string
  is_selection?: boolean
}

export type UpdateSavedWebsitesMessage = {
  action: 'update-saved-websites'
  websites: Website[]
}

export type ChatInitializedMessage = {
  action: 'chat-initialized'
}

export type InvokeFastReplaceMessage = {
  action: 'invoke-fast-replace'
  client_id: number
}

export type Message =
  | GetPageDataMessage
  | PageDataMessage
  | UpdateSavedWebsitesMessage
  | ChatInitializedMessage
  | InvokeFastReplaceMessage
