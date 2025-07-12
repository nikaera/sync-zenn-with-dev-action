import {promises as fs} from 'fs'
import matter from 'gray-matter'
import type {
  ArticleRequest,
  ArticleRequestOption,
  ZennArticle,
  ZennMarkdownHeader
} from './dto'

export class ZennArticleService {
  async getMarkdownFileList(
    articleDir: string,
    modifiedFilePath: string,
    updateAll: boolean
  ): Promise<string[]> {
    if (!updateAll && modifiedFilePath) {
      const addedModified = await fs.readFile(modifiedFilePath, 'utf-8')
      return addedModified
        .split('\n')
        .filter(f => f.startsWith(articleDir) && f.endsWith('.md'))
    }

    const files = await fs.readdir(articleDir)
    return files.filter(f => f.endsWith('.md')).map(f => `${articleDir}/${f}`)
  }

  async parse(filePath: string): Promise<ZennArticle> {
    const markdown = await fs.readFile(filePath, 'utf-8')
    const article = matter(markdown)

    const header = article.data as ZennMarkdownHeader
    return {header, markdown, body: article.content}
  }

  createArticleRequest(
    article: ZennArticle,
    option: ArticleRequestOption
  ): ArticleRequest {
    const devtoBody = article.body
      .replace(/```.+(:.+)?/g, function (match) {
        return match.split(':')[0]
      })
      .replace(/:::.*/g, '')

    const {header} = article
    const {titleFormat} = option

    return {
      article: {
        title: this.formattedTitle(header, titleFormat),
        tags: header.topics.slice(0, 4),
        published: header.published,
        body_markdown: devtoBody
      }
    }
  }

  formattedTitle(header: ZennMarkdownHeader, titleFormat: string): string {
    if (!titleFormat.includes('{title}'))
      throw new Error('{title} is the description needed to specify the title')

    let formatted = titleFormat.replace(/{type}/g, header.type.toUpperCase())
    formatted = formatted.replace(/{title}/g, header.title)
    formatted = formatted.replace(/{emoji}/g, header.emoji)

    return formatted
  }

  async writeDEVArticleIDToFile(
    filePath: string,
    article: ZennArticle,
    devArticleId: number
  ): Promise<void> {
    await fs.writeFile(
      filePath,
      article.markdown.replace(
        /^---/g,
        `---\ndev_article_id: ${String(devArticleId)}`
      )
    )
  }
}
