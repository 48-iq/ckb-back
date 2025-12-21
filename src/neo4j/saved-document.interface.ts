export interface SavedDocument {
  contract: {
    id: number
    name: string
  },
  id: number
  name: string
  pages: {
    id: number
    name: string
    text: string
    paragraphs: {
      id: number
      name: string
      text: string
      facts: {
        id: number
        name: string
        text: string
        entities: {
          id: number
          name: string
        }[]
      }[]
    }[]
  }[]
}