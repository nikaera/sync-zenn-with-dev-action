import * as core from '@actions/core'
import path from 'path'
import {DEVArticle} from './dto'
import {DEVClient} from './DEVClient'
import {ZennArticleService} from './ZennArticleService'

async function run(): Promise<void> {
  const devClient = new DEVClient(core.getInput('api_key', {required: true}))
  const zennArticleService = new ZennArticleService()

  const articleDir = core.getInput('articles', {required: false})
  const modifiedFilePath = core.getInput('added_modified_filepath', {
    required: false
  })

  try {
    const markdownFilePaths: string[] = await zennArticleService.getMarkdownFileList(
      articleDir,
      modifiedFilePath
    )
    core.info(`[markdown files]\n${markdownFilePaths}\n`)

    const devtoArticles: DEVArticle[] = []
    const newlySyncedArticles: string[] = []

    for (const filePath of markdownFilePaths) {
      const article = await zennArticleService.parse(filePath)
      const request = await zennArticleService.createArticleRequest(article)
      const username = core.getInput('username', {required: false})
      if (username) {
        const basename = path.basename(filePath, '.md')
        request.article.canonical_url = `https://zenn.dev/${username}/articles/${basename}`
      }

      if (article.header.devto_article_id) {
        const id = article.header.devto_article_id

        core.info(`[${new Date().toISOString()}] article -> update: ${id}`)

        try {
          const response = await devClient.updateArticle(id, request)
          const {title, url} = response
          core.info(
            `[${new Date().toISOString()}] article -> updated: ${id}, ${
              article.header.title
            }`
          )

          devtoArticles.push({title, url})
        } catch (err) {
          core.error(err.message)
          core.error(
            `[${new Date().toISOString()}] article -> failed updated: ${id}. ${
              article.header.title
            }`
          )
        }
      } else {
        core.info(
          `[${new Date().toISOString()}] article -> create: ${
            article.header.title
          }`
        )

        try {
          const response = await devClient.createArticle(request)

          const {title, url} = response

          core.info(
            `[${new Date().toISOString()}] article -> created: ${title}`
          )

          await zennArticleService.writeDEVArticleIDToFile(
            filePath,
            article,
            response.id
          )

          devtoArticles.push({title, url})
          newlySyncedArticles.push(filePath)
        } catch (err) {
          core.error(err.message)
          core.error(
            `[${new Date().toISOString()}] article -> create failed: ${
              article.header.title
            }`
          )
        }
      }
    }

    core.setOutput('articles', JSON.stringify(devtoArticles, undefined, 2))
    if (newlySyncedArticles.length > 0) {
      core.setOutput('newly-sync-articles', newlySyncedArticles.join(' '))
    }
  } catch (error) {
    core.error(JSON.stringify(error))
    core.setFailed(error.message)
  }
}

run()
