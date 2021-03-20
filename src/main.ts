import * as core from '@actions/core'
import axios from 'axios'
import {promises as fs} from 'fs'
import path from 'path'
import matter from 'gray-matter'

interface ZennMarkdownHeader {
  title: string
  type: 'tech' | 'idea'
  emoji: string
  topics: string[]
  published: boolean
  devto_article_id?: number
}

interface ZennArticle {
  header: ZennMarkdownHeader
  body: string
  markdown: string
}

interface DEVArticle {
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

async function parseZennArticle(filePath: string): Promise<ZennArticle> {
  const markdown = await fs.readFile(filePath, 'utf-8')
  const article = matter(markdown)

  const header = article.data as ZennMarkdownHeader
  return {header, markdown, body: article.content}
}

async function run(): Promise<void> {
  const devtoClient = axios.create({
    baseURL: 'https://dev.to/api',
    headers: {
      'api-key': core.getInput('api_key', {required: true})
    }
  })

  try {
    const articleDir = core.getInput('articles', {required: false})
    const files = await fs.readdir(articleDir)

    let mdFiles: string[]

    const modifiedFilePath = core.getInput('added_modified_filepath', {
      required: false
    })
    if (modifiedFilePath) {
      const addedModified = await fs.readFile(modifiedFilePath, 'utf-8')
      core.info(`[${modifiedFilePath}]\n${addedModified}`)
      mdFiles = addedModified
        .split('\n')
        .filter(f => f.startsWith(articleDir) && f.endsWith('.md'))
    } else {
      mdFiles = files
        .filter(f => f.endsWith('.md'))
        .map(f => `${articleDir}/${f}`)
    }
    core.info(`[markdown files]\n${mdFiles}\n`)

    const devtoArticles: DEVArticle[] = []
    const newlySyncedArticles: string[] = []

    for (const filePath of mdFiles) {
      const article = await parseZennArticle(filePath)

      const devtoBody = article.body
        .replace(/```.+(:.+)?/g, function (match) {
          return match.split(':')[0]
        })
        .replace(/:::.*/g, '')
      const {header} = article

      const request: ArticleRequest = {
        article: {
          title: `[${header.type.toUpperCase()}] ${header.title} ${
            header.emoji
          }`,
          tags: header.topics.slice(0, 3),
          published: false, // header.published,
          body_markdown: devtoBody
        }
      }

      const username = core.getInput('username', {required: false})
      if (username) {
        const basename = path.basename(filePath, '.md')
        request.article.canonical_url = `https://zenn.dev/${username}/articles/${basename}`
      }

      if (article.header.devto_article_id) {
        const id = article.header.devto_article_id

        core.info(
          `[${new Date().toISOString()}] article -> update: ${id}, ${
            header.title
          }`
        )

        try {
          const response = await devtoClient.put<ArticleResponse>(
            `/articles/${id}`,
            request
          )

          const {title, url} = response.data
          core.info(
            `[${new Date().toISOString()}] article -> updated: ${id}, ${
              header.title
            }`
          )

          devtoArticles.push({title, url})
        } catch (err) {
          core.error(err.message)
          core.error(
            `[${new Date().toISOString()}] article -> failed updated: ${id}, ${
              header.title
            }`
          )
        }
      } else {
        core.info(
          `[${new Date().toISOString()}] article -> create: ${header.title}`
        )

        try {
          const response = await devtoClient.post<ArticleResponse>(
            '/articles',
            request
          )

          const {title, url} = response.data
          core.info(`[${new Date().toISOString()}] article -> create: ${title}`)

          devtoArticles.push({title, url})

          await fs.writeFile(
            filePath,
            article.markdown.replace(
              /^---/g,
              `---\ndevto_article_id: ${response.data.id}`
            )
          )

          newlySyncedArticles.push(filePath)
        } catch (err) {
          core.error(err.message)
          core.error(
            `[${new Date().toISOString()}] article -> create failed: ${
              header.title
            }`
          )
        }
      }
    }

    core.setOutput('articles', JSON.stringify(devtoArticles, undefined, 2))
    if (newlySyncedArticles.length > 0) {
      core.setOutput('modified', newlySyncedArticles.join(' '))
    }
  } catch (error) {
    core.error(JSON.stringify(error))
    core.setFailed(error.message)
  }
}

run()
