export const HOME_VIEW_TYPES = {
  WEB: 'Chat',
  API: 'Call API'
}

export type HomeViewType =
  (typeof HOME_VIEW_TYPES)[keyof typeof HOME_VIEW_TYPES]
