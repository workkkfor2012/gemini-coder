import { ApiTool } from './ApiTool'

export default {
  component: ApiTool
}

export const Default = () => (
  <ApiTool
    top_line="API TOOL"
    bottom_line="Code Completions"
    description="Use any model for accurate code completions. The tool attaches selected context in each request."
    checkmarks={[
      'Uses selected context',
      'Supports any model',
      'Accurate completions'
    ]}
  />
)
