import {describe, it, expect} from 'vitest'
import {ZennArticleService} from '../src/zenn_article_service'

describe('ZennArticleService', () => {
  it('Use titleFormat to specify the correct format.', async () => {
    const zennArticleService = new ZennArticleService()
    const article = await zennArticleService.parse(
      './__tests__/articles/test.md'
    )

    const title1 = zennArticleService.formattedTitle(
      article.header,
      '[{type}] {title} {emoji}'
    )
    expect(title1).toBe('[TECH] Test ⛵')

    const title2 = zennArticleService.formattedTitle(article.header, '{title}')
    expect(title2).toBe('Test')

    const title3 = zennArticleService.formattedTitle(
      article.header,
      '{emoji}{title}{emoji}'
    )
    expect(title3).toBe('⛵Test⛵')
  })

  it('Use titleFormat to specify the incorrect format.', async () => {
    const zennArticleService = new ZennArticleService()
    const article = await zennArticleService.parse(
      './__tests__/articles/test.md'
    )

    const wrongFormattedTitle = (titleFormat: string) => {
      const test = () =>
        zennArticleService.formattedTitle(article.header, titleFormat)
      expect(test).toThrow(
        '{title} is the description needed to specify the title'
      )
    }

    wrongFormattedTitle('[{type}] {emoji}')
    wrongFormattedTitle('{Title}')
  })
})
