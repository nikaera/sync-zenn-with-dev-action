import axios, {AxiosInstance} from 'axios'
import {ArticleRequest, ArticleResponse} from './dto'

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

  async createArticle(request: ArticleRequest): Promise<ArticleResponse> {
    const req = await this.client.post<ArticleResponse>(`/articles`, request)
    return req.data
  }

  async updateArticle(
    id: number,
    request: ArticleRequest
  ): Promise<ArticleResponse> {
    const req = await this.client.put<ArticleResponse>(
      `/articles/${id}`,
      request
    )
    return req.data
  }
}
