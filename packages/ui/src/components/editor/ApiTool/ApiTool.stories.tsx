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

export const LongDescription = () => (
  <ApiTool
    top_line="API TOOL"
    bottom_line="Advanced Code Analysis"
    description="This is a very long description that exceeds 100 characters and should be truncated with a Read more/Read less toggle functionality to improve the user experience and prevent overwhelming the interface with too much text at once."
    checkmarks={[
      'Advanced analysis capabilities',
      'Multi-language support',
      'Real-time feedback'
    ]}
  />
)
