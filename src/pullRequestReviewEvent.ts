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

	/*
	 * This function assumes the repo requires 2 reviews to merge, so it will add the label on
	 * the first approving review, and remove it on the second approving review.
	 */
	const labelNeedsOneMore = async () => {
		const LABEL_NAME = 'needs one more';
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
			if (reviewDecision === 'APPROVED') {
				info(`PR is fully approved, removing ${LABEL_NAME} label`);
				await client.rest.issues.removeLabel({
					...context.repo,
					issue_number: number,
					name: LABEL_NAME
				});
				return;
			} else {
				info(`PR is not fully approved, adding ${LABEL_NAME} label`);
				await client.rest.issues.addLabels({
					...context.repo,
					issue_number: number,
					labels: [LABEL_NAME]
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
