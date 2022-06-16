⚠️ **This GitHub Action is decommissioned and archived** ⚠️
---

# The Sorting Hat

GitHub action to label stuff.

## Inputs

### `token`

**Required** The GITHUB_TOKEN secret

## Outputs

### `labels`

New list of PR labels after action run

### `skip-deploy`

Skip deployment based on files being pushed? Returns "true" or "false" -- must compare as a string
value in the "if" expression. This should only be relied on for the default branch in a repo where
commits are squashed in PRs!!

## Example job usage

```
label-pr:
	name: Label PR
	runs-on: ubuntu-latest
	outputs:
		labels: ${{ steps.sorting-hat.outputs.labels }}
		skip-deploy: ${{ steps.sorting-hat.outputs.skip-deploy }}
	steps:
		- id: sorting-hat
			uses: buildcom/the-sorting-hat@v1
			with:
				token: ${{ secrets.GITHUB_TOKEN }}
```

```
skip-deploy:
    needs: label-pr
	# This will not run if only non-production files are found
    if: needs.label-pr.outputs.skip-deploy == 'false'
    runs-on: ubuntu-latest
    steps:
      -  run: <... deployment steps ...>
```


## Features

### On pull_request workflow events

-   Labels PRs based on the number of line additions and deletions
    -   Original PR size labeling functionality taken from [Pull Request Size](https://github.com/noqcks/pull-request-size)
    -   Excludes files listed as `linguist-generated=true` or `pr-size-ignore=true` in `.gitattributes`
-   Labels PRs as `server-only` if no changed files outside the `server` directory are found.

### On push workflow events

-   Checks files being pushed to see if they are all non-production and outputs a true/false `skip-deploy`
    value. This can be used to skip deployment on a push to the `main` branch.

### On pull_request_review workflow events

-   Labels PRs with `needs one more` if they have one approving review but the PR is not fully approved
-   Removes the `needs one more` label once the PR has been fully reviewed

## Development

Read through [GitHub's intro to JavaScript actions](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action).
Local development is currently restricted to just writing the code and being able to use local
TypeScript validation, linting and prettier. Local development may be possible using
[`act`](https://github.com/nektos/act) but I had a hard time getting it to work.

1. Create a local branch based off of the Jira tracker number
(SODEV-#####), make code changes and push to GitHub
1. At least one commit should use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0-beta.2/)
format so a release will be triggered when merging later. (The [`semantic-release`](https://semantic-release.gitbook.io/semantic-release/#commit-message-format)
utility requires that for versioning.)
1. The `release-dev.yml` workflow will run and build the action. NOTE: this will add a commit
automatically with the compiled `dist` files. You'll need to pull before pushing again unless you
force push.
1. Once that workflow is complete, you should create another repo for testing. You can use the
sample workflows in `.github/sample-workflows` to create a workflow for that repo. Also, there is
a script `test/generateFiles.js` that can be used to create different types of changed files
quickly. See the script comments for usage directions. ([example testing repo](https://github.com/lisadean/the-sorting-hat-test))


## CI/CD

-  `release.yml`: On a push to `main`, semantic-release will run to determine if a release and tag
should be generated. Then the ncc build will run and be pushed to the `v1` branch. The `v1` branch
is where calling workflows should point to for the action
-  `release-dev.yml`: On a push to any SODEV* branch, the ncc build will run and be pushed to that
same branch. You can then point test workflows to that branch for the action
-  `release-dry-run.yml`: You can manually run this against a branch to see if a release & tag will
be triggered to make sure you have your commits named properly
-  `label-pr.yml`: This will use this action's labeling feature to label the PRs based on size
-  `get-pr-payload.yml`: You can enable this workflow to get a JSON file containing the pull_request
payload. This makes it easier to look at that data using an IDE's search and collapse features
-  `get-push-payload.yml`: Same as above but for push events

## Testing

This repo needs tests! There's a test file but it's based on the old version that uses probot.

## Deployment

1. When the PR is approved and merged, it will kick off the `release.yml` workflow which will bump
the version and push it to the `v1` branch which production workflows point to.
1. The changes will take effect immediately since the production workflows point to the `v1` branch
version. We could change this to use the actual tags/version numbers at some point for safety, but
that would require changing the consuming workflows so this is simpler.
1. The `dist` directory in the repo is the compiled code (including all node modules). It's what the
workflows actually run.

## Architecture Notes

-   [GitHub Actions Toolkit Documentation](https://github.com/actions/toolkit)
-   To avoid checking in the `node_modules` directory, [`@vercel/ncc`](https://github.com/vercel/ncc) is used to compile everything into a single Javascript file
-   Originally built with [Probot](https://github.com/probot/probot) and converted to run as GitHub
Action instead of an App. This means the application does not have to be deployed but can be run as
needed by a workflow. Docs for running probot app as a GitHub Action: https://github.com/probot/example-github-action
-   Most of the `probot` code has been removed in favor of GitHub's [`@actions`](https://github.com/actions) libraries
