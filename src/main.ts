import * as core from '@actions/core'
import {wait} from './wait'
import path from 'path'
import type {DEVArticle} from './dto'
import {DEVClient} from './dev_client'
import {ZennArticleService} from './zenn_article_service'

async function run(): Promise<void> {
  const maxRetryCount = 10
  const devClient = new DEVClient(core.getInput('api_key', {required: true}))
  const zennArticleService = new ZennArticleService()

  const articleDir = core.getInput('articles', {required: false})
  const titleFormat = core.getInput('title_format', {required: false})
  const modifiedFilePath = core.getInput('added_modified_filepath', {
    required: false
  })
  const updateAll = core.getInput('update_all', {
    required: false
  })
  const isUpdateAll = updateAll.toLowerCase() === 'true'
  core.info(`update_all: ${updateAll}`)

  try {
    const markdownFilePaths: string[] =
      await zennArticleService.getMarkdownFileList(
        articleDir,
        modifiedFilePath,
        isUpdateAll
      )
    core.info(`[markdown files]\n${markdownFilePaths.join('\n')}\n`)

    const devtoArticles: DEVArticle[] = []
    const newlySyncedArticles: string[] = []

    for (const filePath of markdownFilePaths) {
      const article = await zennArticleService.parse(filePath)
      const request = zennArticleService.createArticleRequest(article, {
        titleFormat
      })
      const username = core.getInput('username', {required: false})
      if (username) {
        const basename = path.basename(filePath, '.md')
        request.article.canonical_url = `https://zenn.dev/${username}/articles/${basename}`
      }

      let retryCount = 0
      const devArticleId = article.header.dev_article_id
      if (devArticleId !== undefined) {
        while (retryCount < maxRetryCount) {
          try {
            const response = await devClient.updateArticle(
              devArticleId,
              request
            )
            if (response !== null) {
              devtoArticles.push(response)
            }
            break
          } catch (err) {
            if (err instanceof Error) {
              core.error(err.message)
            }
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

            if (response !== null) {
              await zennArticleService.writeDEVArticleIDToFile(
                filePath,
                article,
                response.id
              )
            }

            if (response !== null) {
              devtoArticles.push(response)
              newlySyncedArticles.push(filePath)
            }
            break
          } catch (err) {
            if (err instanceof Error) {
              core.error(err.message)
            }
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
  } catch (err) {
    core.error(JSON.stringify(err))
    if (err instanceof Error) {
      core.setFailed(err.message)
    }
  }
}

void run()
