import { WebsiteActions } from './WebsiteActions'

export default {
  component: WebsiteActions
}

export const Default = () => (
  <WebsiteActions
    is_loading={false}
    parsed_html={true}
    is_saved={false}
    on_save={() => console.log('Save clicked')}
    on_remove={() => console.log('Remove clicked')}
  />
)

export const Saved = () => (
  <WebsiteActions
    is_loading={false}
    parsed_html={true}
    is_saved={true}
    on_save={() => console.log('Save clicked')}
    on_remove={() => console.log('Remove clicked')}
  />
)

export const WithSelection = () => (
  <WebsiteActions
    is_loading={false}
    parsed_html={true}
    is_saved={false}
    on_save={() => console.log('Save clicked')}
    on_remove={() => console.log('Remove clicked')}
  />
)

export const NoParsedContent = () => (
  <WebsiteActions
    is_loading={false}
    parsed_html={false}
    is_saved={false}
    on_save={() => console.log('Save clicked')}
    on_remove={() => console.log('Remove clicked')}
  />
)

export const Loading = () => (
  <WebsiteActions
    is_loading={true}
    parsed_html={false}
    is_saved={false}
    on_save={() => console.log('Save clicked')}
    on_remove={() => console.log('Remove clicked')}
  />
)
