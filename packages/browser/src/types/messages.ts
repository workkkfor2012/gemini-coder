import { HtmlParser } from '../utils/html-parser'

export type GetParsedHtmlMessage = { 
  action: 'get-parsed-html' 
}

export type ParsedHtmlMessage = {
  action: 'parsed-html'
  parsed_html: HtmlParser.ParsedResult | null
}

export type Message =
  | GetParsedHtmlMessage
  | ParsedHtmlMessage