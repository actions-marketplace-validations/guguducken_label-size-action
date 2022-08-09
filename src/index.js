const core = require('@actions/core');
const github = require('@actions/github');

const github_token = core.getInput("size_token", { required: true });

async function run() {

    try {
        //get a octokit client
        const octokit = github.getOctokit(github_token, { userAgent: "guguducken/label-size-action" });

        //get github context
        const context = github.context;

        //get pull request num
        const num = context.payload?.pull_request?.number;

        const { data: pr } = await octokit.rest.pulls.get(
            {
                ...context.repo,
                pull_number: num,
                mediaType: {
                    format: 'diff'
                }
            }
        );
        const { path, additions, deletions } = pr;
        core.info(JSON.stringify(path) + " " + JSON.stringify(additions) + " " + JSON.stringify(deletions));
        // const { labels } = pr;
    } catch (err) {
        core.setFailed(err.message);
    }
}

run();