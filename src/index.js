const core = require('@actions/core');
const github = require('@actions/github');

const github_token = core.getInput("size_token");

async function run() {

    try {
        //get a octokit client
        const octokit = github.getOctokit(github_token, { userAgent: "guguducken/label-size-action" });

        //get github context
        const context = github.context;

        const repo_owner = context.repo.owner;
        const repo_name = context.repo.repo;

        //get pull request num
        const num = context.payload?.pull_request?.number;

        const { data: pr } = await octokit.rest.pulls.get(
            {
                ...context.repo,
                pull_number: num,
            }
        );
        core.info(JSON.stringify(pr));
    } catch (err) {
        core.setFailed(err.message);
    }
}

run();