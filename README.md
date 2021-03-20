# Just sync Zenn articles to DEV

It can be used to sync articles written in [Zenn](https://zenn.dev/) to [DEV](http://dev.to/).

## Usage

See [action.yml](https://github.com/nikaera/sync-zenn-with-dev-action/blob/main/.github/workflows/test.yml).

The minimum usage is as follows.

```yml
name: 'build-test'
on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, '[skip ci]') == false
    steps:
      - name: setup node project
        uses: actions/checkout@v2
      - run: |
          npm install
          npm run all
      - name: dev.to action step
        uses: nikaera/sync-zenn-with-dev-action
        id: dev-to
        with:
          # DEV API key will be required.
          api_key: ${{ secrets.api_key }}
          # (optional) Your account name in Zenn (Fields to be filled in if canonical url is set.)
          username: nikaera
          # (optional) Synchronize only the articles in the file path divided by line breaks.
          added_modified_filepath: ./added_modified.txt
        # If there is a new article to be synced to DEV,
        # the ID of the DEV article will be assigned to the markdown header of the Zenn article.
        # (This is used to determine whether the article will be newly created or updated next time.)
      - name: write article id of DEV to articles of Zenn.
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add ${{ steps.dev-to.outputs.newly-sync-articles }}
          git commit -m "sync: Zenn with DEV [skip ci]"
          git push
        if: steps.dev-to.outputs.newly-sync-articles
        # Output the title and URL of the article synced to DEV.
      - name: Get the output articles.
        run: echo "${{ steps.dev-to.outputs.articles }}"
```

## Customizing

### inputs

| key | description | required |
|:---|:---|:---:|
|api_key| The [API Key](https://docs.forem.com/api/#section/Authentication) required to use the DEV API | true |
|username | **Your account name** in Zenn (Fields to be filled in if canonical url is set.)  | false |
|added_modified_filepath | Synchronize only the articles in the file path divided by line breaks. You can use [jitterbit/get-changed-files@v1](https://github.com/jitterbit/get-changed-files) to get only the file paths of articles that have changed in the correct format. | false |

### outputs

| key | description |
|:---|:---|
| articles | A list of URLs of dev.to articles that have been created or updated |
| newly-sync-articles | File path list of newly synchronized articles. **Make sure to commit the list of articles set to this value, as they will be updated.** See [action.yml](https://github.com/nikaera/sync-zenn-with-dev-action/blob/main/.github/workflows/test.yml#L31-L38) |

## License

[MIT](https://github.com/nikaera/sync-zenn-with-dev-action/blob/main/LICENSE)
