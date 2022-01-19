import * as core from '@actions/core';
import { Context } from '@actions/github/lib/context';
import { GitHub } from '@actions/github/lib/utils';
import { PullRequestReviewEvent } from '@octokit/webhooks-types';
import type { PullRequestReviewDecision } from '@octokit/graphql-schema';
import { info, getLabelNames } from './index';

type input = { context: Context; client: InstanceType<typeof GitHub> };
export const handlePullRequestReviewEvent = async ({ context, client }: input) => {
	const {
		pull_request: { number, title, labels },
		review: {
			state,
			id,
			user: { login: reviewer }
		}
	}: PullRequestReviewEvent = context.payload as PullRequestReviewEvent;

	const labelNeedsOneMore = async () => {
		// This assumes the repo requires 2 reviews to merge
		if (state === 'approved') {
			info(`Approving review from ${reviewer} found (id: ${id})`);
			const query = `{
				repository(owner: "${context.repo.owner}", name: "${context.repo.repo}") {
					pullRequest(number: ${number}) {
						title
						reviewDecision
						url
					}
				}
			}`;
			const response: any = await client.graphql(query);
			const reviewDecision: PullRequestReviewDecision = response.repository.pullRequest.reviewDecision;
			if (reviewDecision === 'APPROVED' && labels.find((label) => label.name === 'needs-one-more')) {
				info(`PR is fully approved, removing needs-one-more label if present`);
				await client.rest.issues.removeLabel({
					...context.repo,
					issue_number: number,
					name: 'needs-one-more'
				});
				return;
			}
			if (reviewDecision !== 'APPROVED') {
				info(`PR is not fully approved, adding needs-one-more label if needed`);
				await client.rest.issues.addLabels({
					...context.repo,
					issue_number: number,
					labels: ['needs-one-more']
				});
			}
		}
	};

	const outputCurrentLabels = async () => {
		// This can be refactored to share with other event functions when tests are added
		const { data } = await client.rest.issues.listLabelsOnIssue({
			...context.repo,
			issue_number: number
		});
		const labels = getLabelNames(data).toString();
		info(`Labels as a result of this action: ${labels.length ? labels : 'no labels'}`);
		core.setOutput('labels', labels);
	};

	// wrapping in a try/catch because we don't want to fail the action for errors on these calls
	try {
		info(`Processing review for pull request #${number}: ${title}`);
		await labelNeedsOneMore();
		await outputCurrentLabels();
	} catch (err) {
		info(`ERROR in handling pull request review event: ${err}`);
	}
};
