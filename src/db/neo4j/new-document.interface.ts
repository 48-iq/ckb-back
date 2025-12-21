export interface NewDocument {
  contract: {
    name: string
    nameEmbedding: number[]
  }
  name: string
  nameEmbedding: number[]
  pages: {
    name: string
    text: string
    textEmbedding: number[]
    paragraphs: {
      text: string
      textEmbedding: number[]
      name: string
      facts: {
        text: string
        textEmbedding: number[]
        name: string
        entities: {
          name: string
          nameEmbedding: number[]
        }[]
      }[]
    }[]
  }[]
}