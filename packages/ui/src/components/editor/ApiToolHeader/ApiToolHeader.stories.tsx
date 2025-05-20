import { ApiToolHeader } from './ApiToolHeader'

export default {
  component: ApiToolHeader,
}

export const Default = () => (
  <ApiToolHeader
    top_line="API TOOL"
    bottom_line="Code Completions"
    description="Use any model for accurate code completions. The tool attaches selected context in each request."
  />
)
