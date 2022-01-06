# The Sorting Hat

GitHub action to label stuff.

## Inputs

## `token`

**Required** The GITHUB_TOKEN secret

## Outputs

## `labels`

New list of PR labels after action run

## Example job usage

label-pr:
	name: Label PR
	runs-on: ubuntu-latest
	outputs:
		labels: ${{ steps.sorting-hat.outputs.labels }}
	steps:
		- id: sorting-hat
			uses: buildcom/the-sorting-hat@v1
			with:
				token: ${{ secrets.GITHUB_TOKEN }}

## Features

-   Labels PRs based on the number of line additions and deletions
    -   Original PR size labeling functionality taken from [Pull Request Size](https://github.com/noqcks/pull-request-size)
    -   Excludes files listed as `linguist-generated=true` or `pr-size-ignore=true` in `.gitattributes`
-   Labels PRs as `server-only` if no changed files outside the `server` directory are found.

## Development

Read through [GitHub's intro to JavaScript actions](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action).
Local development is currently restricted to just writing the code and being able to use local
TypeScript validation, linting and prettier. Local development may be possible using
[`act`](https://github.com/nektos/act) but I had a hard time getting it to work.

1. Create a local branch based off of the Jira tracker number
(SODEV-#####), make code changes and push to GitHub
1. The `release-dev.yml` workflow will run and build the action. NOTE: this will add a commit
automatically with the compiled `dist` files. You'll need to pull before pushing again unless you
force push.
1. Once that workflow is complete, you can use another branch to test changes. You will need to
modify the `run-action.yml` file in that branch to point to the testing branch and SODEV branch (see
comments in file). There is a script `test/generateFiles.js` that can be used to create different
types of changed files quickly. See the script comments for usage directions.

## Testing

This repo needs tests! There's a test file but it's based on the old version that uses probot.

## Deployment

1. When the PR is approved and merged, it will kick off the `release.yml` workflow which will bump
the version, build the action and push it to the `v1` branch which production workflows point to.
1. The changes will take effect immediately since the production workflows point to the `v1` branch
version. We could change this to use the actual tags/version numbers at some point for safety, but
that would require changing the consuming workflows so this is simpler.
1. The `dist` directory in the repo is the compiled code (including all node modules). It's what the
workflows actually run.

## Architecture Notes

-   To avoid checking in the `node_modules` directory, [`@vercel/ncc`](https://github.com/vercel/ncc) is used to compile everything into a single Javascript file
-   Originally built with [Probot](https://github.com/probot/probot) and converted to run as GitHub
Action instead of an App. This means the application does not have to be deployed but can be run as
needed by a workflow. Docs for running probot app as a GitHub Action: https://github.com/probot/example-github-action
-   Most of the `probot` code has been removed in favor of GitHub's [`@actions`](https://github.com/actions) libraries
