import axios from 'axios'
import type {AxiosInstance} from 'axios'
import * as core from '@actions/core'
import type {ArticleRequest, ArticleResponse, DEVArticle} from './dto'

export class DEVClient {
  private readonly client: AxiosInstance

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://dev.to/api',
      headers: {
        'api-key': apiKey
      }
    })
  }

  async createArticle(request: ArticleRequest): Promise<DEVArticle | null> {
    try {
      core.info(
        `[${new Date().toISOString()}] article -> created: ${
          request.article.title
        }`
      )

      const response = await this.client.post<ArticleResponse>(
        '/articles',
        request
      )
      core.info(
        `[${new Date().toISOString()}] article -> created ${
          request.article.title
        }`
      )

      const {id, title, url} = response.data
      return {id, title, url}
    } catch (err) {
      if (err instanceof Error) {
        core.error(err.message)
        core.error(
          `[${new Date().toISOString()}] article -> failed created: ${
            request.article.title
          }`
        )
      }
    }

    return null
  }

  async updateArticle(
    articleId: number,
    request: ArticleRequest
  ): Promise<DEVArticle | null> {
    try {
      core.info(
        `[${new Date().toISOString()}] article -> update: ${String(articleId)}`
      )

      const response = await this.client.put<ArticleResponse>(
        `/articles/${String(articleId)}`,
        request
      )
      core.info(
        `[${new Date().toISOString()}] article -> updated: ${String(articleId)}, ${
          request.article.title
        }`
      )

      const {id, title, url} = response.data
      return {id, title, url}
    } catch (err) {
      if (err instanceof Error) {
        core.error(err.message)
        core.error(
          `[${new Date().toISOString()}] article -> failed updated: ${String(articleId)}. ${
            request.article.title
          }`
        )
      }
    }

    return null
  }
}
