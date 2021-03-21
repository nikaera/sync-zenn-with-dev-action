import * as core from '@actions/core'
import {wait} from './wait'
import path from 'path'
import {DEVArticle} from './dto'
import {DEVClient} from './DEVClient'
import {ZennArticleService} from './ZennArticleService'

async function run(): Promise<void> {
  const maxRetryCount = 10
  const devClient = new DEVClient(core.getInput('api_key', {required: true}))
  const zennArticleService = new ZennArticleService()

  const articleDir = core.getInput('articles', {required: false})
  const modifiedFilePath = core.getInput('added_modified_filepath', {
    required: false
  })
  const updateAll =
    core
      .getInput('update_all', {
        required: false
      })
      .toLowerCase() === 'true'

  try {
    const markdownFilePaths: string[] = await zennArticleService.getMarkdownFileList(
      articleDir,
      modifiedFilePath,
      updateAll
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

      let retryCount = 0
      const devArticleId = article.header.dev_article_id
      if (devArticleId) {
        while (retryCount < maxRetryCount) {
          try {
            const response = await devClient.updateArticle(
              devArticleId,
              request
            )
            devtoArticles.push(response as DEVArticle)
            break
          } catch (err) {
            core.error(err.message)
          } finally {
            // There is a limit of 30 requests per 30 seconds.
            // https://docs.forem.com/api/#operation/updateArticle
            await wait(1 * 1000)
            retryCount++
          }
        }
      } else {
        while (retryCount < maxRetryCount) {
          try {
            const response = await devClient.createArticle(request)

            await zennArticleService.writeDEVArticleIDToFile(
              filePath,
              article,
              response!.id
            )

            devtoArticles.push(response as DEVArticle)
            newlySyncedArticles.push(filePath)
            break
          } catch (err) {
            core.error(err.message)
          } finally {
            // There is a limit of 10 requests per 30 seconds.
            // https://docs.forem.com/api/#operation/createArticle
            await wait(3 * 1000)
            retryCount++
          }
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
