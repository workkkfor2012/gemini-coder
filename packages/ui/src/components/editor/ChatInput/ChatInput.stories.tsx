import { ChatInput } from './ChatInput'

export default {
  component: ChatInput
}

// Basic usage with empty input
export const Empty = () => (
  <ChatInput
    value=""
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// Input with some text
export const WithText = () => (
  <ChatInput
    value="Hello, this is a sample message"
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// Disabled submit button
export const DisabledSubmit = () => (
  <ChatInput
    value="Cannot submit this message"
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={false}
    submit_disabled_title="Cannot submit at this time"
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// Multiline text
export const MultilineText = () => (
  <ChatInput
    value="This is a message\nwith multiple\nlines of text"
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// Long text that should trigger scrolling
export const LongText = () => (
  <ChatInput
    value="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// With token count
export const WithTokenCount = () => (
  <ChatInput
    value="This message has a token count."
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    token_count={15}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// With large token count
export const WithLargeTokenCount = () => (
  <ChatInput
    value="This message has a large token count."
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    token_count={12345}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// In code completions mode
export const CodeCompletionsMode = () => (
  <ChatInput
    value="Suggest some code..."
    chat_history={['Previous suggestion 1', 'Previous suggestion 2']}
    chat_history_fim_mode={['FIM history 1', 'FIM history 2']}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// With active selection
export const WithActiveSelection = () => (
  <ChatInput
    value="Ask about the "
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_selection={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// With active selection and @selection already present
export const WithActiveSelectionAndPlaceholder = () => (
  <ChatInput
    value="Ask about the @selection"
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_selection={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)

// With @selection placeholder but no active selection
export const WithPlaceholderNoSelection = () => (
  <ChatInput
    value="Ask about the @selection"
    chat_history={[]}
    chat_history_fim_mode={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
  />
)
