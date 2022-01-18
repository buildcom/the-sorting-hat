import * as core from '@actions/core';
import { PullRequestReviewEvent } from '@octokit/webhooks-types';
import type { Query, PullRequestReviewDecision } from '@octokit/graphql-schema';
import { info, getLabelNames } from './index';

export const handlePullRequestReviewEvent = async ({ context, client }) => {
	const {
		pull_request: { number, title, labels },
		review: { state }
	}: PullRequestReviewEvent = context.payload as PullRequestReviewEvent;

	const labelNeedsOneMore = async ({ number, labels, state }) => {
		if (state === 'approved') {
			info(`Approving review found`);
			const query = `{
				repository(${{ ...context.repo }}) {
					pullRequest(number: ${number}) {
						title
						reviewDecision
						url
					}
				}
			}`;
			const data: Query = await client.graphql(query);
			const reviewDecision: PullRequestReviewDecision = data.repository.pullRequest.reviewDecision;
			if (reviewDecision === 'APPROVED' && labels.find((label) => label.name === 'needs-one-more')) {
				info(`PR is fully approved and needs-one-more label is present, removing needs-one-more label`);
				await client.rest.issues.removeLabel({
					...context.repo,
					issue_number: number,
					name: 'needs-one-more'
				});
				return;
			}
			if (reviewDecision !== 'APPROVED') {
				info(`PR is not fully approved, adding needs-one-more label`);
				await client.rest.issues.addLabels({
					...context.repo,
					issue_number: number,
					labels: ['needs-one-more']
				});
			}
		}
	};

	const outputCurrentLabels = async ({ number }) => {
		// This can be refactored to share with other event functions when tests are added
		const { data } = await client.rest.issues.listLabelsOnIssue({
			...context.repo,
			issue_number: number
		});
		const labels = getLabelNames(data).toString();
		info(`Action output -- labels: ${labels}`);
		core.setOutput('labels', labels);
	};

	info(`Processing review for pull request #${number}: ${title}`);
	labelNeedsOneMore({ number, labels, state });
	outputCurrentLabels({ number });
};
