export interface ZennMarkdownHeader {
  title: string
  type: 'tech' | 'idea'
  emoji: string
  topics: string[]
  published: boolean
  dev_article_id?: number
}
export interface ZennArticle {
  header: ZennMarkdownHeader
  body: string
  markdown: string
}

export interface DEVArticle {
  id: number
  title: string
  url: string
}

export interface ArticleResponse {
  id: number
  url: string
  title: string
}

export interface ArticleRequest {
  article: {
    title: string
    body_markdown?: string
    published?: boolean
    series?: string
    main_image?: string
    canonical_url?: string
    description?: string
    tags?: string[]
    organization_id?: number
  }
}
